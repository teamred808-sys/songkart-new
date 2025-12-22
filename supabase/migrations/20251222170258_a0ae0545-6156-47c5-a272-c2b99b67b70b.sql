-- Create buyer_carts table for persistent cart tracking
CREATE TABLE public.buyer_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  UNIQUE(buyer_id, status)
);

-- Enable RLS
ALTER TABLE public.buyer_carts ENABLE ROW LEVEL SECURITY;

-- RLS policies for buyer_carts
CREATE POLICY "Users can manage their own carts"
ON public.buyer_carts FOR ALL
USING (auth.uid() = buyer_id);

-- Add new columns to cart_items
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS seller_id uuid,
ADD COLUMN IF NOT EXISTS base_price numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_commission numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_exclusive boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create exclusive_reservations table
CREATE TABLE public.exclusive_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid NOT NULL,
  license_tier_id uuid REFERENCES public.license_tiers(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'released')),
  reserved_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  released_reason text
);

-- Unique constraint: only one active reservation per song
CREATE UNIQUE INDEX idx_exclusive_reservations_active 
ON public.exclusive_reservations (song_id) 
WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.exclusive_reservations ENABLE ROW LEVEL SECURITY;

-- RLS policies for exclusive_reservations
CREATE POLICY "Users can view their own reservations"
ON public.exclusive_reservations FOR SELECT
USING (auth.uid() = buyer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own reservations"
ON public.exclusive_reservations FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own reservations"
ON public.exclusive_reservations FOR UPDATE
USING (auth.uid() = buyer_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create checkout_sessions table
CREATE TABLE public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  cart_snapshot jsonb NOT NULL,
  subtotal numeric NOT NULL,
  platform_fee numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  currency text DEFAULT 'INR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired', 'cancelled')),
  cashfree_order_id text,
  cashfree_payment_session_id text,
  acknowledgment_accepted boolean DEFAULT false,
  acknowledgment_timestamp timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes'),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for checkout_sessions
CREATE POLICY "Users can manage their own checkout sessions"
ON public.checkout_sessions FOR ALL
USING (auth.uid() = buyer_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  buyer_id uuid NOT NULL,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id),
  subtotal numeric NOT NULL,
  platform_fee numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  currency text DEFAULT 'INR',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  cashfree_order_id text,
  cashfree_payment_id text,
  fulfillment_status text DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  fulfilled_at timestamptz
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for orders
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = buyer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Create order_items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  song_id uuid REFERENCES public.songs(id) NOT NULL,
  seller_id uuid NOT NULL,
  license_tier_id uuid REFERENCES public.license_tiers(id) NOT NULL,
  license_type text NOT NULL,
  is_exclusive boolean DEFAULT false,
  price numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  seller_amount numeric NOT NULL,
  license_pdf_url text,
  watermark_code text,
  download_count integer DEFAULT 0,
  max_downloads integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_items
CREATE POLICY "Users can view their own order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.buyer_id = auth.uid() OR order_items.seller_id = auth.uid())
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create download_access table
CREATE TABLE public.download_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  order_item_id uuid REFERENCES public.order_items(id) NOT NULL,
  song_id uuid REFERENCES public.songs(id) NOT NULL,
  access_type text DEFAULT 'full' CHECK (access_type IN ('full', 'preview')),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(buyer_id, song_id)
);

-- Enable RLS
ALTER TABLE public.download_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for download_access
CREATE POLICY "Users can view their own download access"
ON public.download_access FOR SELECT
USING (auth.uid() = buyer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage download access"
ON public.download_access FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_order_number text;
  counter integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS integer)), 0) + 1
  INTO counter
  FROM public.orders
  WHERE order_number LIKE 'ORD%';
  
  new_order_number := 'ORD' || LPAD(counter::text, 8, '0');
  RETURN new_order_number;
END;
$$;

-- Create trigger to update updated_at on cart_items
CREATE OR REPLACE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update updated_at on buyer_carts
CREATE OR REPLACE TRIGGER update_buyer_carts_updated_at
BEFORE UPDATE ON public.buyer_carts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();