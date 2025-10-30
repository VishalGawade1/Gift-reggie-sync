import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId, token } = await req.json();

    // Validate input
    if (!storeId || !token) {
      return new Response(
        JSON.stringify({ error: 'Store ID and Token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update GIFT_REGGIE_STORE_ID
    const storeIdResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/set_secret`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        secret_name: 'GIFT_REGGIE_STORE_ID',
        secret_value: storeId,
      }),
    });

    if (!storeIdResponse.ok) {
      const errorText = await storeIdResponse.text();
      console.error('Failed to update Store ID:', errorText);
      throw new Error('Failed to update Store ID');
    }

    // Update GIFT_REGGIE_TOKEN
    const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/set_secret`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        secret_name: 'GIFT_REGGIE_TOKEN',
        secret_value: token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to update Token:', errorText);
      throw new Error('Failed to update Token');
    }

    console.log('Successfully updated Gift Reggie credentials');

    return new Response(
      JSON.stringify({ success: true, message: 'Credentials updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-credentials function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
