import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WishlistItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  [key: string]: unknown;
}

interface Wishlist {
  id: string;
  customer_id?: string;
  email?: string;
  public_url?: string;
  items?: WishlistItem[];
  [key: string]: unknown;
}

interface ApiResponse {
  wishlists?: Wishlist[];
  data?: Wishlist[];
  pagination?: {
    next?: string;
    next_cursor?: string;
  };
  next_cursor?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const storeId = Deno.env.get('GIFT_REGGIE_STORE_ID');
    const token = Deno.env.get('GIFT_REGGIE_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!storeId || !token) {
      throw new Error('Missing Gift Reggie credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const baseUrl = `https://gift-reggie.eshopadmin.com/api/${storeId}`;
    
    console.log('Starting Gift Reggie sync...');

    // Detect endpoint and pagination style
    const endpoints = ['wishlists', 'wishlists.json', 'wishlist'];
    let detectedEndpoint = '';
    let paginationStyle: 'cursor' | 'page' = 'page';
    let listKey = 'wishlists';

    for (const endpoint of endpoints) {
      try {
        const probeUrl = `${baseUrl}/${endpoint}?limit=1`;
        console.log(`Probing endpoint: ${probeUrl}`);
        
        const probeResponse = await fetch(probeUrl, {
          headers: {
            'X-Access-Token': token,
          },
        });

        if (probeResponse.ok) {
          const probeData: ApiResponse = await probeResponse.json();
          
          if (probeData.next_cursor || probeData.pagination?.next_cursor) {
            paginationStyle = 'cursor';
          }
          
          if (probeData.wishlists) {
            listKey = 'wishlists';
          } else if (probeData.data) {
            listKey = 'data';
          }
          
          detectedEndpoint = endpoint;
          console.log(`Detected endpoint: ${endpoint}, style: ${paginationStyle}, key: ${listKey}`);
          break;
        }
      } catch (err) {
        console.log(`Endpoint ${endpoint} not available:`, err);
      }
    }

    if (!detectedEndpoint) {
      throw new Error('Could not detect wishlists endpoint');
    }

    // Get last sync checkpoint
    const { data: checkpoint } = await supabase
      .from('sync_state')
      .select('value')
      .eq('key', 'last_cursor')
      .single();

    let currentCursor = checkpoint?.value || '';
    let totalWishlists = 0;
    let totalItems = 0;
    const maxRetries = 5;

    // Sync loop
    while (true) {
      const params = new URLSearchParams({
        limit: '250',
      });

      if (paginationStyle === 'cursor' && currentCursor) {
        params.append('cursor', currentCursor);
      } else if (paginationStyle === 'page' && currentCursor) {
        params.append('page', currentCursor);
      }

      const url = `${baseUrl}/${detectedEndpoint}?${params}`;
      console.log(`Fetching: ${url}`);

      let retries = 0;
      let response;
      
      while (retries < maxRetries) {
        try {
          response = await fetch(url, {
            headers: {
              'X-Access-Token': token,
            },
          });

          if (response.status === 429 || response.status >= 500) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * Math.pow(2, retries), 30000);
            console.log(`Rate limited or server error, retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
            continue;
          }

          break;
        } catch (err) {
          console.error(`Request failed (attempt ${retries + 1}):`, err);
          retries++;
          if (retries >= maxRetries) {
            throw err;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Failed to fetch wishlists: ${response?.status}`);
      }

      const data: ApiResponse = await response.json();
      const wishlists = (data[listKey as keyof ApiResponse] || []) as Wishlist[];
      
      console.log(`Fetched ${wishlists.length} wishlists`);

      // Upsert wishlists and items
      for (const wishlist of wishlists) {
        const { error: wishlistError } = await supabase
          .from('wishlists')
          .upsert({
            id: wishlist.id,
            owner_customer_id: wishlist.customer_id,
            owner_email: wishlist.email,
            public_url: wishlist.public_url,
            raw: wishlist,
            last_synced_at: new Date().toISOString(),
          });

        if (wishlistError) {
          console.error(`Error upserting wishlist ${wishlist.id}:`, wishlistError);
          continue;
        }

        totalWishlists++;

        // Upsert items if they exist
        if (wishlist.items && Array.isArray(wishlist.items)) {
          for (const item of wishlist.items) {
            const { error: itemError } = await supabase
              .from('wishlist_items')
              .upsert({
                wishlist_id: wishlist.id,
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                raw: item,
              });

            if (itemError) {
              console.error(`Error upserting item for wishlist ${wishlist.id}:`, itemError);
            } else {
              totalItems++;
            }
          }
        }
      }

      // Update checkpoint
      const nextCursor = data.next_cursor || data.pagination?.next_cursor || data.pagination?.next;
      
      if (nextCursor) {
        currentCursor = nextCursor;
        await supabase
          .from('sync_state')
          .upsert({ key: 'last_cursor', value: currentCursor, updated_at: new Date().toISOString() });
      } else {
        // End of data, reset cursor for next full cycle
        console.log('Reached end of wishlists, resetting cursor');
        await supabase
          .from('sync_state')
          .upsert({ key: 'last_cursor', value: '', updated_at: new Date().toISOString() });
        break;
      }

      // Rate limiting: ~1 req/sec
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Sync complete: ${totalWishlists} wishlists, ${totalItems} items`);

    return new Response(
      JSON.stringify({ 
        success: true,
        wishlists: totalWishlists,
        items: totalItems,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-gift-reggie function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
