-- =============================================
-- SELLER TIER SYSTEM - Database Schema
-- =============================================

-- 1. Create seller_tiers configuration table
CREATE TABLE public.seller_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level integer NOT NULL UNIQUE,
  name text NOT NULL,
  badge_label text NOT NULL,
  min_lifetime_sales numeric NOT NULL DEFAULT 0,
  max_price_lyrics_only numeric, -- null = no cap
  max_price_with_audio numeric, -- null = no cap
  badge_color text DEFAULT 'gray',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create seller_tier_status table (tracks each seller's current tier)
CREATE TABLE public.seller_tier_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_tier_level integer NOT NULL DEFAULT 1 REFERENCES public.seller_tiers(tier_level),
  lifetime_sales_amount numeric NOT NULL DEFAULT 0,
  tier_frozen boolean DEFAULT false,
  frozen_reason text,
  frozen_by uuid REFERENCES public.profiles(id),
  frozen_at timestamptz,
  last_tier_check timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create seller_tier_history for audit trail
CREATE TABLE public.seller_tier_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_tier integer,
  new_tier integer NOT NULL,
  lifetime_sales_at_change numeric,
  trigger_type text NOT NULL, -- 'sale', 'admin_override', 'fraud_freeze', 'initial'
  triggered_by uuid REFERENCES public.profiles(id), -- null for automated
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Create tier_abuse_flags table for suspicious activity
CREATE TABLE public.tier_abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_type text NOT NULL, -- 'self_purchase', 'linked_account', 'suspicious_pattern'
  transaction_id uuid REFERENCES public.transactions(id),
  buyer_id uuid REFERENCES public.profiles(id),
  details jsonb DEFAULT '{}',
  status text DEFAULT 'pending', -- 'pending', 'reviewed', 'confirmed', 'dismissed'
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- 5. Insert default tier data
INSERT INTO public.seller_tiers (tier_level, name, badge_label, min_lifetime_sales, max_price_lyrics_only, max_price_with_audio, badge_color, description) VALUES
(1, 'Newbie', 'Newbie', 0, 999, 1999, 'slate', 'Entry-level tier for new sellers. Build your reputation!'),
(2, 'Rising Artist', 'Rising Artist', 10000, 1999, 4999, 'blue', 'You''re on the rise! Keep creating great content.'),
(3, 'Pro Artist', 'Pro Artist', 25000, 7999, 12999, 'purple', 'Professional status achieved. Buyers trust your work.'),
(4, 'True Artist', 'True Artist', 50000, 19999, 29999, 'amber', 'High-prestige tier with strong market validation.'),
(5, 'Legend', 'Legend', 100000, NULL, NULL, 'emerald', 'Elite status! Complete pricing freedom earned.');

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- 6. Function: Get seller tier info
CREATE OR REPLACE FUNCTION public.get_seller_tier(p_seller_id uuid)
RETURNS TABLE (
  tier_level integer,
  tier_name text,
  badge_label text,
  badge_color text,
  lifetime_sales numeric,
  max_price_lyrics_only numeric,
  max_price_with_audio numeric,
  next_tier_threshold numeric,
  amount_to_next_tier numeric,
  is_frozen boolean,
  frozen_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status seller_tier_status%ROWTYPE;
  v_tier seller_tiers%ROWTYPE;
  v_next_tier seller_tiers%ROWTYPE;
BEGIN
  -- Get or create seller tier status
  SELECT * INTO v_status FROM seller_tier_status WHERE seller_id = p_seller_id;
  
  IF NOT FOUND THEN
    -- Create initial tier status for seller
    INSERT INTO seller_tier_status (seller_id, current_tier_level, lifetime_sales_amount)
    VALUES (p_seller_id, 1, 0)
    RETURNING * INTO v_status;
    
    -- Log initial tier assignment
    INSERT INTO seller_tier_history (seller_id, previous_tier, new_tier, lifetime_sales_at_change, trigger_type)
    VALUES (p_seller_id, NULL, 1, 0, 'initial');
  END IF;
  
  -- Get current tier details
  SELECT * INTO v_tier FROM seller_tiers WHERE seller_tiers.tier_level = v_status.current_tier_level;
  
  -- Get next tier if exists
  SELECT * INTO v_next_tier FROM seller_tiers 
  WHERE seller_tiers.tier_level = v_status.current_tier_level + 1;
  
  RETURN QUERY SELECT
    v_tier.tier_level,
    v_tier.name,
    v_tier.badge_label,
    v_tier.badge_color,
    v_status.lifetime_sales_amount,
    v_tier.max_price_lyrics_only,
    v_tier.max_price_with_audio,
    v_next_tier.min_lifetime_sales,
    CASE 
      WHEN v_next_tier.min_lifetime_sales IS NOT NULL 
      THEN GREATEST(0, v_next_tier.min_lifetime_sales - v_status.lifetime_sales_amount)
      ELSE NULL 
    END,
    v_status.tier_frozen,
    v_status.frozen_reason;
END;
$$;

-- 7. Function: Calculate and update seller tier
CREATE OR REPLACE FUNCTION public.calculate_and_update_tier(p_seller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lifetime_sales numeric;
  v_current_tier integer;
  v_new_tier integer;
  v_is_frozen boolean;
BEGIN
  -- Calculate lifetime sales from completed transactions
  SELECT COALESCE(SUM(seller_amount), 0) INTO v_lifetime_sales
  FROM transactions
  WHERE seller_id = p_seller_id AND payment_status = 'completed';
  
  -- Get current status
  SELECT current_tier_level, tier_frozen INTO v_current_tier, v_is_frozen
  FROM seller_tier_status
  WHERE seller_id = p_seller_id;
  
  -- If no status exists, create one
  IF NOT FOUND THEN
    INSERT INTO seller_tier_status (seller_id, current_tier_level, lifetime_sales_amount)
    VALUES (p_seller_id, 1, v_lifetime_sales);
    
    INSERT INTO seller_tier_history (seller_id, previous_tier, new_tier, lifetime_sales_at_change, trigger_type)
    VALUES (p_seller_id, NULL, 1, v_lifetime_sales, 'initial');
    
    v_current_tier := 1;
    v_is_frozen := false;
  END IF;
  
  -- If frozen, only update sales amount but don't change tier
  IF v_is_frozen THEN
    UPDATE seller_tier_status
    SET lifetime_sales_amount = v_lifetime_sales, updated_at = now(), last_tier_check = now()
    WHERE seller_id = p_seller_id;
    RETURN;
  END IF;
  
  -- Determine appropriate tier based on lifetime sales (never downgrade)
  SELECT tier_level INTO v_new_tier
  FROM seller_tiers
  WHERE min_lifetime_sales <= v_lifetime_sales
  ORDER BY tier_level DESC
  LIMIT 1;
  
  -- Ensure we never downgrade
  v_new_tier := GREATEST(v_current_tier, COALESCE(v_new_tier, 1));
  
  -- Update tier status
  UPDATE seller_tier_status
  SET 
    current_tier_level = v_new_tier,
    lifetime_sales_amount = v_lifetime_sales,
    updated_at = now(),
    last_tier_check = now()
  WHERE seller_id = p_seller_id;
  
  -- Log tier change if upgraded
  IF v_new_tier > v_current_tier THEN
    INSERT INTO seller_tier_history (seller_id, previous_tier, new_tier, lifetime_sales_at_change, trigger_type)
    VALUES (p_seller_id, v_current_tier, v_new_tier, v_lifetime_sales, 'sale');
  END IF;
END;
$$;

-- 8. Function: Validate song price against tier limits
CREATE OR REPLACE FUNCTION public.validate_song_price(
  p_seller_id uuid,
  p_price numeric,
  p_has_audio boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_info RECORD;
  v_max_allowed numeric;
BEGIN
  -- Get seller's current tier
  SELECT * INTO v_tier_info FROM get_seller_tier(p_seller_id);
  
  -- Determine max allowed price based on content type
  IF p_has_audio THEN
    v_max_allowed := v_tier_info.max_price_with_audio;
  ELSE
    v_max_allowed := v_tier_info.max_price_lyrics_only;
  END IF;
  
  -- If max is NULL, there's no cap (Legend tier)
  IF v_max_allowed IS NULL THEN
    RETURN jsonb_build_object(
      'valid', true,
      'max_allowed', NULL,
      'tier_name', v_tier_info.tier_name,
      'tier_level', v_tier_info.tier_level,
      'message', 'No price limit for Legend tier'
    );
  END IF;
  
  -- Check if price exceeds limit
  IF p_price > v_max_allowed THEN
    RETURN jsonb_build_object(
      'valid', false,
      'max_allowed', v_max_allowed,
      'requested_price', p_price,
      'tier_name', v_tier_info.tier_name,
      'tier_level', v_tier_info.tier_level,
      'amount_to_next_tier', v_tier_info.amount_to_next_tier,
      'message', format('Price ₹%s exceeds your %s tier limit of ₹%s. Earn ₹%s more in sales to unlock higher pricing.',
        p_price, v_tier_info.tier_name, v_max_allowed, COALESCE(v_tier_info.amount_to_next_tier, 0))
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'max_allowed', v_max_allowed,
    'tier_name', v_tier_info.tier_name,
    'tier_level', v_tier_info.tier_level,
    'message', 'Price is within tier limits'
  );
END;
$$;

-- 9. Function: Check for self-purchase (abuse prevention)
CREATE OR REPLACE FUNCTION public.check_self_purchase(
  p_buyer_id uuid,
  p_song_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  -- Get the song's seller
  SELECT seller_id INTO v_seller_id FROM songs WHERE id = p_song_id;
  
  IF v_buyer_id = v_seller_id THEN
    -- Log the abuse attempt
    INSERT INTO tier_abuse_flags (seller_id, flag_type, buyer_id, details)
    VALUES (v_seller_id, 'self_purchase', p_buyer_id, 
      jsonb_build_object('song_id', p_song_id, 'attempted_at', now()));
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'You cannot purchase your own songs'
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- 10. Trigger function: Update tier on transaction complete
CREATE OR REPLACE FUNCTION public.trigger_update_seller_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger on completed payments
  IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
    PERFORM calculate_and_update_tier(NEW.seller_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 11. Create the trigger
CREATE TRIGGER on_transaction_complete_update_tier
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_update_seller_tier();

-- 12. Function: Admin freeze/unfreeze tier
CREATE OR REPLACE FUNCTION public.admin_freeze_seller_tier(
  p_seller_id uuid,
  p_freeze boolean,
  p_reason text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_tier integer;
BEGIN
  -- Get current tier
  SELECT current_tier_level INTO v_current_tier
  FROM seller_tier_status
  WHERE seller_id = p_seller_id;
  
  -- Update freeze status
  UPDATE seller_tier_status
  SET 
    tier_frozen = p_freeze,
    frozen_reason = CASE WHEN p_freeze THEN p_reason ELSE NULL END,
    frozen_by = CASE WHEN p_freeze THEN p_admin_id ELSE NULL END,
    frozen_at = CASE WHEN p_freeze THEN now() ELSE NULL END,
    updated_at = now()
  WHERE seller_id = p_seller_id;
  
  -- Log the action
  INSERT INTO seller_tier_history (seller_id, previous_tier, new_tier, trigger_type, triggered_by, notes)
  VALUES (
    p_seller_id, 
    v_current_tier, 
    v_current_tier, 
    CASE WHEN p_freeze THEN 'fraud_freeze' ELSE 'admin_override' END,
    p_admin_id,
    CASE WHEN p_freeze THEN 'Tier frozen: ' || COALESCE(p_reason, 'No reason provided') 
         ELSE 'Tier unfrozen' END
  );
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.seller_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_tier_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_tier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_abuse_flags ENABLE ROW LEVEL SECURITY;

-- seller_tiers: Public read, admin write
CREATE POLICY "Anyone can view tier definitions"
ON public.seller_tiers FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tier definitions"
ON public.seller_tiers FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- seller_tier_status: Sellers can read own, admins full access
CREATE POLICY "Sellers can view their own tier status"
ON public.seller_tier_status FOR SELECT
USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert tier status"
ON public.seller_tier_status FOR INSERT
WITH CHECK (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tier status"
ON public.seller_tier_status FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- seller_tier_history: Sellers can read own, admins full access
CREATE POLICY "Sellers can view their own tier history"
ON public.seller_tier_history FOR SELECT
USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert tier history"
ON public.seller_tier_history FOR INSERT
WITH CHECK (true); -- Inserted by security definer functions

-- tier_abuse_flags: Admin only
CREATE POLICY "Admins can manage abuse flags"
ON public.tier_abuse_flags FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for seller_tiers
CREATE TRIGGER update_seller_tiers_updated_at
BEFORE UPDATE ON public.seller_tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for seller_tier_status
CREATE TRIGGER update_seller_tier_status_updated_at
BEFORE UPDATE ON public.seller_tier_status
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster tier lookups
CREATE INDEX idx_seller_tier_status_seller_id ON public.seller_tier_status(seller_id);
CREATE INDEX idx_seller_tier_history_seller_id ON public.seller_tier_history(seller_id);
CREATE INDEX idx_tier_abuse_flags_seller_id ON public.tier_abuse_flags(seller_id);
CREATE INDEX idx_tier_abuse_flags_status ON public.tier_abuse_flags(status);