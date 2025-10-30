-- Create wishlists table
CREATE TABLE IF NOT EXISTS public.wishlists (
  id TEXT PRIMARY KEY,
  owner_customer_id TEXT,
  owner_email TEXT,
  public_url TEXT,
  raw JSONB,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  wishlist_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  quantity INT,
  raw JSONB,
  PRIMARY KEY (wishlist_id, product_id, variant_id),
  FOREIGN KEY (wishlist_id) REFERENCES public.wishlists(id) ON DELETE CASCADE
);

-- Create sync_state table for tracking sync progress
CREATE TABLE IF NOT EXISTS public.sync_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed)
CREATE POLICY "Anyone can view wishlists"
  ON public.wishlists
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view wishlist items"
  ON public.wishlist_items
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view sync state"
  ON public.sync_state
  FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wishlists_owner_email ON public.wishlists(owner_email);
CREATE INDEX IF NOT EXISTS idx_wishlists_last_synced ON public.wishlists(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);