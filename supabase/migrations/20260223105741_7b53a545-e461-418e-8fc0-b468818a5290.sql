
-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  created_by uuid NOT NULL,
  creator_role text NOT NULL CHECK (creator_role IN ('admin', 'seller')),
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE,
  license_type text,
  min_purchase_amount numeric DEFAULT 0,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(code)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS for promo_codes
CREATE POLICY "Admins can manage all promo codes"
ON public.promo_codes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can view their own promo codes"
ON public.promo_codes FOR SELECT
USING (auth.uid() = created_by AND creator_role = 'seller');

CREATE POLICY "Sellers can insert their own promo codes"
ON public.promo_codes FOR INSERT
WITH CHECK (auth.uid() = created_by AND creator_role = 'seller' AND has_role(auth.uid(), 'seller'::app_role));

CREATE POLICY "Sellers can update their own promo codes"
ON public.promo_codes FOR UPDATE
USING (auth.uid() = created_by AND creator_role = 'seller');

CREATE POLICY "Authenticated users can validate active promo codes"
ON public.promo_codes FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()) AND (usage_limit IS NULL OR usage_count < usage_limit));

-- Create promo_code_usages table
CREATE TABLE public.promo_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  discount_amount numeric NOT NULL,
  used_at timestamptz DEFAULT now()
);

ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all usages"
ON public.promo_code_usages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own usages"
ON public.promo_code_usages FOR SELECT
USING (auth.uid() = user_id);

-- Add promo columns to checkout_sessions
ALTER TABLE public.checkout_sessions ADD COLUMN promo_code_id uuid REFERENCES public.promo_codes(id);
ALTER TABLE public.checkout_sessions ADD COLUMN promo_discount numeric DEFAULT 0;

-- Updated_at trigger for promo_codes
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
