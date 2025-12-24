-- =====================================================
-- COUNTRY-WISE DYNAMIC PRICING SYSTEM
-- =====================================================

-- 1. Create pricing_zones table
CREATE TABLE public.pricing_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_code text NOT NULL UNIQUE,
  zone_name text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1.0,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT multiplier_min_one CHECK (multiplier >= 1.0)
);

-- 2. Create pricing_zone_countries table
CREATE TABLE public.pricing_zone_countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code char(2) NOT NULL UNIQUE,
  country_name text NOT NULL,
  zone_id uuid NOT NULL REFERENCES public.pricing_zones(id) ON DELETE RESTRICT,
  currency_code char(3) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create currency_exchange_rates table
CREATE TABLE public.currency_exchange_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code char(3) NOT NULL UNIQUE,
  currency_name text NOT NULL,
  currency_symbol text NOT NULL,
  rate_from_inr numeric NOT NULL,
  last_updated timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 4. Create order_pricing_snapshots table
CREATE TABLE public.order_pricing_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  base_price_inr numeric NOT NULL,
  zone_code text NOT NULL,
  zone_multiplier numeric NOT NULL,
  tier_max_price numeric,
  calculated_price_inr numeric NOT NULL,
  final_price_inr numeric NOT NULL,
  buyer_currency_code char(3) NOT NULL,
  exchange_rate_used numeric NOT NULL,
  final_price_buyer_currency numeric NOT NULL,
  buyer_country_code char(2) NOT NULL,
  detection_method text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Add columns to checkout_sessions
ALTER TABLE public.checkout_sessions 
ADD COLUMN IF NOT EXISTS buyer_country_code char(2),
ADD COLUMN IF NOT EXISTS buyer_currency_code char(3) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS exchange_rate_used numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS pricing_zone_id uuid REFERENCES public.pricing_zones(id);

-- 6. Enable RLS on all new tables
ALTER TABLE public.pricing_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_zone_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_pricing_snapshots ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for pricing_zones
CREATE POLICY "Anyone can view active pricing zones"
ON public.pricing_zones FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage pricing zones"
ON public.pricing_zones FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS Policies for pricing_zone_countries
CREATE POLICY "Anyone can view active country mappings"
ON public.pricing_zone_countries FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage country mappings"
ON public.pricing_zone_countries FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. RLS Policies for currency_exchange_rates
CREATE POLICY "Anyone can view active exchange rates"
ON public.currency_exchange_rates FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage exchange rates"
ON public.currency_exchange_rates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. RLS Policies for order_pricing_snapshots
CREATE POLICY "Buyers can view their own pricing snapshots"
ON public.order_pricing_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_pricing_snapshots.order_id
    AND orders.buyer_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all pricing snapshots"
ON public.order_pricing_snapshots FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. Insert default pricing zones
INSERT INTO public.pricing_zones (zone_code, zone_name, multiplier, description) VALUES
  ('ZONE_IN', 'India', 1.0, 'Base pricing zone - home market'),
  ('ZONE_SEA', 'Southeast Asia', 1.0, 'Similar purchasing power to India'),
  ('ZONE_LA', 'Latin America', 1.2, 'Moderate premium markets'),
  ('ZONE_EMEA', 'Europe, Middle East & Africa', 1.5, 'Premium markets'),
  ('ZONE_AU', 'Australia & Oceania', 1.8, 'High premium markets'),
  ('ZONE_NA', 'North America', 2.0, 'Highest premium markets'),
  ('ZONE_DEFAULT', 'Default', 1.0, 'Fallback for unmapped countries');

-- 12. Insert default exchange rates (approximate rates, admin can update)
INSERT INTO public.currency_exchange_rates (currency_code, currency_name, currency_symbol, rate_from_inr) VALUES
  ('INR', 'Indian Rupee', '₹', 1.0),
  ('USD', 'US Dollar', '$', 0.012),
  ('EUR', 'Euro', '€', 0.011),
  ('GBP', 'British Pound', '£', 0.0095),
  ('AUD', 'Australian Dollar', 'A$', 0.018),
  ('CAD', 'Canadian Dollar', 'C$', 0.016),
  ('SGD', 'Singapore Dollar', 'S$', 0.016),
  ('AED', 'UAE Dirham', 'د.إ', 0.044),
  ('MYR', 'Malaysian Ringgit', 'RM', 0.055),
  ('THB', 'Thai Baht', '฿', 0.42),
  ('PHP', 'Philippine Peso', '₱', 0.67),
  ('IDR', 'Indonesian Rupiah', 'Rp', 190),
  ('BRL', 'Brazilian Real', 'R$', 0.059),
  ('MXN', 'Mexican Peso', 'MX$', 0.20),
  ('JPY', 'Japanese Yen', '¥', 1.78),
  ('KRW', 'South Korean Won', '₩', 15.8),
  ('ZAR', 'South African Rand', 'R', 0.22),
  ('NZD', 'New Zealand Dollar', 'NZ$', 0.020),
  ('CHF', 'Swiss Franc', 'CHF', 0.011),
  ('SEK', 'Swedish Krona', 'kr', 0.13);

-- 13. Insert country to zone mappings
-- Get zone IDs
DO $$
DECLARE
  zone_in_id uuid;
  zone_sea_id uuid;
  zone_la_id uuid;
  zone_emea_id uuid;
  zone_au_id uuid;
  zone_na_id uuid;
  zone_default_id uuid;
BEGIN
  SELECT id INTO zone_in_id FROM public.pricing_zones WHERE zone_code = 'ZONE_IN';
  SELECT id INTO zone_sea_id FROM public.pricing_zones WHERE zone_code = 'ZONE_SEA';
  SELECT id INTO zone_la_id FROM public.pricing_zones WHERE zone_code = 'ZONE_LA';
  SELECT id INTO zone_emea_id FROM public.pricing_zones WHERE zone_code = 'ZONE_EMEA';
  SELECT id INTO zone_au_id FROM public.pricing_zones WHERE zone_code = 'ZONE_AU';
  SELECT id INTO zone_na_id FROM public.pricing_zones WHERE zone_code = 'ZONE_NA';
  SELECT id INTO zone_default_id FROM public.pricing_zones WHERE zone_code = 'ZONE_DEFAULT';

  -- India
  INSERT INTO public.pricing_zone_countries (country_code, country_name, zone_id, currency_code) VALUES
    ('IN', 'India', zone_in_id, 'INR');

  -- Southeast Asia
  INSERT INTO public.pricing_zone_countries (country_code, country_name, zone_id, currency_code) VALUES
    ('SG', 'Singapore', zone_sea_id, 'SGD'),
    ('MY', 'Malaysia', zone_sea_id, 'MYR'),
    ('TH', 'Thailand', zone_sea_id, 'THB'),
    ('VN', 'Vietnam', zone_sea_id, 'USD'),
    ('ID', 'Indonesia', zone_sea_id, 'IDR'),
    ('PH', 'Philippines', zone_sea_id, 'PHP');

  -- Latin America
  INSERT INTO public.pricing_zone_countries (country_code, country_name, zone_id, currency_code) VALUES
    ('BR', 'Brazil', zone_la_id, 'BRL'),
    ('MX', 'Mexico', zone_la_id, 'MXN'),
    ('AR', 'Argentina', zone_la_id, 'USD'),
    ('CO', 'Colombia', zone_la_id, 'USD'),
    ('CL', 'Chile', zone_la_id, 'USD'),
    ('PE', 'Peru', zone_la_id, 'USD');

  -- Europe, Middle East & Africa
  INSERT INTO public.pricing_zone_countries (country_code, country_name, zone_id, currency_code) VALUES
    ('GB', 'United Kingdom', zone_emea_id, 'GBP'),
    ('DE', 'Germany', zone_emea_id, 'EUR'),
    ('FR', 'France', zone_emea_id, 'EUR'),
    ('IT', 'Italy', zone_emea_id, 'EUR'),
    ('ES', 'Spain', zone_emea_id, 'EUR'),
    ('NL', 'Netherlands', zone_emea_id, 'EUR'),
    ('BE', 'Belgium', zone_emea_id, 'EUR'),
    ('SE', 'Sweden', zone_emea_id, 'SEK'),
    ('CH', 'Switzerland', zone_emea_id, 'CHF'),
    ('AE', 'United Arab Emirates', zone_emea_id, 'AED'),
    ('SA', 'Saudi Arabia', zone_emea_id, 'USD'),
    ('ZA', 'South Africa', zone_emea_id, 'ZAR'),
    ('NG', 'Nigeria', zone_emea_id, 'USD'),
    ('EG', 'Egypt', zone_emea_id, 'USD'),
    ('KE', 'Kenya', zone_emea_id, 'USD'),
    ('IL', 'Israel', zone_emea_id, 'USD'),
    ('PL', 'Poland', zone_emea_id, 'EUR'),
    ('AT', 'Austria', zone_emea_id, 'EUR'),
    ('PT', 'Portugal', zone_emea_id, 'EUR'),
    ('IE', 'Ireland', zone_emea_id, 'EUR');

  -- Australia & Oceania
  INSERT INTO public.pricing_zone_countries (country_code, country_name, zone_id, currency_code) VALUES
    ('AU', 'Australia', zone_au_id, 'AUD'),
    ('NZ', 'New Zealand', zone_au_id, 'NZD');

  -- North America
  INSERT INTO public.pricing_zone_countries (country_code, country_name, zone_id, currency_code) VALUES
    ('US', 'United States', zone_na_id, 'USD'),
    ('CA', 'Canada', zone_na_id, 'CAD');

END $$;

-- 14. Insert dynamic pricing enabled setting
INSERT INTO public.platform_settings (key, value)
VALUES ('dynamic_pricing_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 15. Create indexes for performance
CREATE INDEX idx_pricing_zone_countries_zone_id ON public.pricing_zone_countries(zone_id);
CREATE INDEX idx_pricing_zone_countries_country_code ON public.pricing_zone_countries(country_code);
CREATE INDEX idx_order_pricing_snapshots_order_id ON public.order_pricing_snapshots(order_id);
CREATE INDEX idx_order_pricing_snapshots_order_item_id ON public.order_pricing_snapshots(order_item_id);

-- 16. Create calculate_dynamic_price function
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_base_price_inr numeric,
  p_seller_id uuid,
  p_has_audio boolean,
  p_country_code char(2)
)
RETURNS TABLE (
  base_price_inr numeric,
  zone_code text,
  zone_multiplier numeric,
  tier_max_price numeric,
  calculated_price_inr numeric,
  final_price_inr numeric,
  buyer_currency_code char(3),
  exchange_rate numeric,
  final_price_buyer_currency numeric,
  is_capped_by_tier boolean,
  is_dynamic_pricing_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dynamic_pricing_enabled boolean;
  v_zone_code text;
  v_zone_multiplier numeric;
  v_currency_code char(3);
  v_exchange_rate numeric;
  v_tier_info RECORD;
  v_tier_max numeric;
  v_calculated_price numeric;
  v_final_price numeric;
  v_final_buyer_currency numeric;
  v_is_capped boolean := false;
BEGIN
  -- Check if dynamic pricing is globally enabled
  SELECT (value->>'enabled')::boolean INTO v_dynamic_pricing_enabled
  FROM platform_settings
  WHERE key = 'dynamic_pricing_enabled';
  
  v_dynamic_pricing_enabled := COALESCE(v_dynamic_pricing_enabled, true);

  -- Get zone info for the country
  SELECT pz.zone_code, pz.multiplier, pzc.currency_code
  INTO v_zone_code, v_zone_multiplier, v_currency_code
  FROM pricing_zone_countries pzc
  JOIN pricing_zones pz ON pz.id = pzc.zone_id
  WHERE pzc.country_code = p_country_code
    AND pzc.is_active = true
    AND pz.is_active = true;

  -- If no zone found, use default
  IF v_zone_code IS NULL THEN
    SELECT pz.zone_code, pz.multiplier
    INTO v_zone_code, v_zone_multiplier
    FROM pricing_zones pz
    WHERE pz.zone_code = 'ZONE_DEFAULT';
    
    v_zone_code := COALESCE(v_zone_code, 'ZONE_DEFAULT');
    v_zone_multiplier := COALESCE(v_zone_multiplier, 1.0);
    v_currency_code := 'USD'; -- Default currency for unknown countries
  END IF;

  -- Get exchange rate
  SELECT cer.rate_from_inr INTO v_exchange_rate
  FROM currency_exchange_rates cer
  WHERE cer.currency_code = v_currency_code
    AND cer.is_active = true;
  
  v_exchange_rate := COALESCE(v_exchange_rate, 0.012); -- Default to USD rate

  -- Get seller's tier max price
  SELECT * INTO v_tier_info FROM get_seller_tier(p_seller_id);
  
  IF p_has_audio THEN
    v_tier_max := v_tier_info.max_price_with_audio;
  ELSE
    v_tier_max := v_tier_info.max_price_lyrics_only;
  END IF;

  -- Calculate price with multiplier (only if dynamic pricing enabled)
  IF v_dynamic_pricing_enabled THEN
    v_calculated_price := p_base_price_inr * v_zone_multiplier;
  ELSE
    v_calculated_price := p_base_price_inr;
    v_zone_multiplier := 1.0;
  END IF;

  -- Enforce minimum: price can never be less than base
  v_calculated_price := GREATEST(v_calculated_price, p_base_price_inr);

  -- Apply tier cap if exists (tier limits are absolute)
  IF v_tier_max IS NOT NULL AND v_calculated_price > v_tier_max THEN
    v_final_price := v_tier_max;
    v_is_capped := true;
  ELSE
    v_final_price := v_calculated_price;
  END IF;

  -- Calculate buyer currency amount
  v_final_buyer_currency := ROUND(v_final_price * v_exchange_rate, 2);

  RETURN QUERY SELECT
    p_base_price_inr,
    v_zone_code,
    v_zone_multiplier,
    v_tier_max,
    v_calculated_price,
    v_final_price,
    v_currency_code,
    v_exchange_rate,
    v_final_buyer_currency,
    v_is_capped,
    v_dynamic_pricing_enabled;
END;
$$;

-- 17. Create get_country_pricing function for bulk price lookups
CREATE OR REPLACE FUNCTION public.get_country_pricing(
  p_country_code char(2)
)
RETURNS TABLE (
  zone_code text,
  zone_name text,
  multiplier numeric,
  currency_code char(3),
  currency_symbol text,
  exchange_rate numeric,
  is_dynamic_pricing_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dynamic_pricing_enabled boolean;
BEGIN
  -- Check if dynamic pricing is globally enabled
  SELECT (value->>'enabled')::boolean INTO v_dynamic_pricing_enabled
  FROM platform_settings
  WHERE key = 'dynamic_pricing_enabled';
  
  v_dynamic_pricing_enabled := COALESCE(v_dynamic_pricing_enabled, true);

  RETURN QUERY
  SELECT 
    pz.zone_code,
    pz.zone_name,
    CASE WHEN v_dynamic_pricing_enabled THEN pz.multiplier ELSE 1.0 END,
    pzc.currency_code,
    cer.currency_symbol,
    cer.rate_from_inr,
    v_dynamic_pricing_enabled
  FROM pricing_zone_countries pzc
  JOIN pricing_zones pz ON pz.id = pzc.zone_id
  LEFT JOIN currency_exchange_rates cer ON cer.currency_code = pzc.currency_code
  WHERE pzc.country_code = p_country_code
    AND pzc.is_active = true
    AND pz.is_active = true;

  -- If no rows returned, return default zone info
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'ZONE_DEFAULT'::text,
      'Default'::text,
      1.0::numeric,
      'USD'::char(3),
      '$'::text,
      0.012::numeric,
      v_dynamic_pricing_enabled;
  END IF;
END;
$$;

-- 18. Create trigger for updated_at on pricing_zones
CREATE TRIGGER update_pricing_zones_updated_at
BEFORE UPDATE ON public.pricing_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();