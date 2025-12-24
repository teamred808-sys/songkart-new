-- Add dynamic_pricing_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN dynamic_pricing_enabled boolean NOT NULL DEFAULT true;

-- Update the calculate_dynamic_price function to respect seller's preference
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(p_base_price_inr numeric, p_seller_id uuid, p_has_audio boolean, p_country_code character)
 RETURNS TABLE(base_price_inr numeric, zone_code text, zone_multiplier numeric, tier_max_price numeric, calculated_price_inr numeric, final_price_inr numeric, buyer_currency_code character, exchange_rate numeric, final_price_buyer_currency numeric, is_capped_by_tier boolean, is_dynamic_pricing_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_global_dynamic_pricing_enabled boolean;
  v_seller_dynamic_pricing_enabled boolean;
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
  SELECT (value->>'enabled')::boolean INTO v_global_dynamic_pricing_enabled
  FROM platform_settings
  WHERE key = 'dynamic_pricing_enabled';
  
  v_global_dynamic_pricing_enabled := COALESCE(v_global_dynamic_pricing_enabled, true);

  -- Check if seller has dynamic pricing enabled
  SELECT dynamic_pricing_enabled INTO v_seller_dynamic_pricing_enabled
  FROM profiles
  WHERE id = p_seller_id;
  
  v_seller_dynamic_pricing_enabled := COALESCE(v_seller_dynamic_pricing_enabled, true);

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
    v_currency_code := 'USD';
  END IF;

  -- Get exchange rate
  SELECT cer.rate_from_inr INTO v_exchange_rate
  FROM currency_exchange_rates cer
  WHERE cer.currency_code = v_currency_code
    AND cer.is_active = true;
  
  v_exchange_rate := COALESCE(v_exchange_rate, 0.012);

  -- Get seller's tier max price
  SELECT * INTO v_tier_info FROM get_seller_tier(p_seller_id);
  
  IF p_has_audio THEN
    v_tier_max := v_tier_info.max_price_with_audio;
  ELSE
    v_tier_max := v_tier_info.max_price_lyrics_only;
  END IF;

  -- Calculate price with multiplier (only if both global AND seller dynamic pricing enabled)
  IF v_global_dynamic_pricing_enabled AND v_seller_dynamic_pricing_enabled THEN
    v_calculated_price := p_base_price_inr * v_zone_multiplier;
  ELSE
    v_calculated_price := p_base_price_inr;
    v_zone_multiplier := 1.0;
  END IF;

  -- Enforce minimum: price can never be less than base
  v_calculated_price := GREATEST(v_calculated_price, p_base_price_inr);

  -- Apply tier cap if exists
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
    (v_global_dynamic_pricing_enabled AND v_seller_dynamic_pricing_enabled);
END;
$function$;