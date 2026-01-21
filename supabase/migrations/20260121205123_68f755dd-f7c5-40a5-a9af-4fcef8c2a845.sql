-- ===========================================
-- TWO-TIER STRIKE SYSTEM IMPLEMENTATION
-- ===========================================

-- 1. Create seller_strikes table
CREATE TABLE public.seller_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  strike_type TEXT NOT NULL CHECK (strike_type IN ('community', 'copyright')),
  reason TEXT NOT NULL,
  details TEXT,
  evidence_urls JSONB DEFAULT '[]'::jsonb,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'appealed', 'reversed')),
  expires_at TIMESTAMPTZ,
  
  -- Admin actions
  issued_by UUID,
  reversed_by UUID,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  
  -- Appeal tracking
  appeal_status TEXT CHECK (appeal_status IN ('pending', 'approved', 'rejected')),
  appeal_reason TEXT,
  appeal_submitted_at TIMESTAMPTZ,
  appeal_reviewed_by UUID,
  appeal_reviewed_at TIMESTAMPTZ,
  appeal_response TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for seller_strikes
CREATE INDEX idx_seller_strikes_seller_id ON seller_strikes(seller_id);
CREATE INDEX idx_seller_strikes_status ON seller_strikes(status);
CREATE INDEX idx_seller_strikes_type_status ON seller_strikes(strike_type, status);
CREATE INDEX idx_seller_strikes_expires_at ON seller_strikes(expires_at) WHERE status = 'active';

-- 2. Create seller_account_health table
CREATE TABLE public.seller_account_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE,
  
  -- Health score
  health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  
  -- Strike counts (cached for performance)
  community_strikes_active INTEGER NOT NULL DEFAULT 0,
  copyright_strikes_active INTEGER NOT NULL DEFAULT 0,
  
  -- Account state
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_at TIMESTAMPTZ,
  frozen_until TIMESTAMPTZ,
  freeze_reason TEXT,
  
  is_deactivated BOOLEAN NOT NULL DEFAULT false,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,
  
  -- Fund forfeiture
  funds_forfeited BOOLEAN NOT NULL DEFAULT false,
  forfeited_amount NUMERIC DEFAULT 0,
  forfeited_at TIMESTAMPTZ,
  
  -- Restoration
  restored_by UUID,
  restored_at TIMESTAMPTZ,
  restoration_notes TEXT,
  
  -- Timestamps
  last_strike_at TIMESTAMPTZ,
  last_health_update TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for seller_account_health
CREATE INDEX idx_seller_account_health_frozen ON seller_account_health(is_frozen) WHERE is_frozen = true;
CREATE INDEX idx_seller_account_health_frozen_until ON seller_account_health(frozen_until) WHERE frozen_until IS NOT NULL;
CREATE INDEX idx_seller_account_health_deactivated ON seller_account_health(is_deactivated) WHERE is_deactivated = true;

-- 3. Create strike_notifications table
CREATE TABLE public.strike_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  strike_id UUID REFERENCES public.seller_strikes(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strike_notifications_seller_unread ON strike_notifications(seller_id, is_read) WHERE is_read = false;

-- 4. Enable RLS on all tables
ALTER TABLE seller_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_account_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE strike_notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for seller_strikes
CREATE POLICY "Admins can manage all strikes"
ON seller_strikes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

CREATE POLICY "Sellers can view their own strikes"
ON seller_strikes FOR SELECT USING (auth.uid() = seller_id);

-- 6. RLS Policies for seller_account_health
CREATE POLICY "Admins can manage all account health"
ON seller_account_health FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

CREATE POLICY "Sellers can view their own health"
ON seller_account_health FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Public can view health scores"
ON seller_account_health FOR SELECT USING (true);

-- 7. RLS Policies for strike_notifications
CREATE POLICY "Sellers can manage their own notifications"
ON strike_notifications FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all notifications"
ON strike_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- 8. Health Score Calculation Function
CREATE OR REPLACE FUNCTION public.calculate_seller_health(p_seller_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_strikes INTEGER;
  v_copyright_strikes INTEGER;
  v_health INTEGER := 100;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE strike_type = 'community' AND status = 'active'),
    COUNT(*) FILTER (WHERE strike_type = 'copyright' AND status = 'active')
  INTO v_community_strikes, v_copyright_strikes
  FROM seller_strikes
  WHERE seller_id = p_seller_id;
  
  -- Community strikes: -10 each
  v_health := v_health - (v_community_strikes * 10);
  
  -- Copyright strikes: -20 for 1st, -25 for 2nd (total -45 for 2)
  IF v_copyright_strikes >= 1 THEN
    v_health := v_health - 20;
  END IF;
  IF v_copyright_strikes >= 2 THEN
    v_health := v_health - 25;
  END IF;
  
  RETURN GREATEST(0, LEAST(100, v_health));
END;
$$;

-- 9. Issue Strike Function
CREATE OR REPLACE FUNCTION public.issue_seller_strike(
  p_seller_id UUID,
  p_strike_type TEXT,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL,
  p_evidence_urls JSONB DEFAULT '[]'::jsonb,
  p_song_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strike_id UUID;
  v_active_count INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_new_health INTEGER;
  v_wallet_balance NUMERIC;
BEGIN
  -- Copyright strikes expire after 2 months
  IF p_strike_type = 'copyright' THEN
    v_expires_at := now() + INTERVAL '2 months';
  END IF;
  
  -- Insert the strike
  INSERT INTO seller_strikes (
    seller_id, strike_type, reason, details, evidence_urls, 
    song_id, issued_by, expires_at
  ) VALUES (
    p_seller_id, p_strike_type, p_reason, p_details, p_evidence_urls,
    p_song_id, auth.uid(), v_expires_at
  ) RETURNING id INTO v_strike_id;
  
  -- Count active strikes of this type
  SELECT COUNT(*) INTO v_active_count
  FROM seller_strikes
  WHERE seller_id = p_seller_id 
    AND strike_type = p_strike_type 
    AND status = 'active';
  
  -- Ensure health record exists
  INSERT INTO seller_account_health (seller_id)
  VALUES (p_seller_id)
  ON CONFLICT (seller_id) DO NOTHING;
  
  -- Handle Community Strikes
  IF p_strike_type = 'community' THEN
    UPDATE seller_account_health 
    SET community_strikes_active = v_active_count,
        last_strike_at = now(),
        updated_at = now()
    WHERE seller_id = p_seller_id;
    
    -- 3 community strikes = 1 month freeze
    IF v_active_count >= 3 THEN
      UPDATE seller_account_health SET
        is_frozen = true,
        frozen_at = now(),
        frozen_until = now() + INTERVAL '1 month',
        freeze_reason = 'Accumulated 3 community guidelines strikes'
      WHERE seller_id = p_seller_id;
      
      -- Create freeze notification
      INSERT INTO strike_notifications (seller_id, strike_id, notification_type, title, message)
      VALUES (
        p_seller_id, v_strike_id, 'account_frozen',
        'Account Frozen for 1 Month',
        'You have received 3 community guidelines strikes. Your account is frozen for 1 month. Uploads and withdrawals are disabled.'
      );
    END IF;
    
  -- Handle Copyright Strikes
  ELSIF p_strike_type = 'copyright' THEN
    UPDATE seller_account_health 
    SET copyright_strikes_active = v_active_count,
        last_strike_at = now(),
        updated_at = now()
    WHERE seller_id = p_seller_id;
    
    -- 2nd strike: Upload suspension warning
    IF v_active_count = 2 THEN
      INSERT INTO strike_notifications (seller_id, strike_id, notification_type, title, message)
      VALUES (
        p_seller_id, v_strike_id, 'strike_warning',
        'Upload Privileges Suspended - Final Warning',
        'You have received your 2nd copyright strike. Upload privileges are suspended. ONE MORE STRIKE will result in permanent account deactivation and fund forfeiture.'
      );
    
    -- 3rd strike: Permanent deactivation + fund forfeiture
    ELSIF v_active_count >= 3 THEN
      -- Get wallet balance before forfeiture
      SELECT COALESCE(available_balance, 0) + COALESCE(pending_balance, 0)
      INTO v_wallet_balance
      FROM seller_wallets WHERE user_id = p_seller_id;
      
      UPDATE seller_account_health SET
        is_deactivated = true,
        deactivated_at = now(),
        deactivation_reason = 'Accumulated 3 copyright strikes',
        funds_forfeited = true,
        forfeited_amount = COALESCE(v_wallet_balance, 0),
        forfeited_at = now()
      WHERE seller_id = p_seller_id;
      
      -- Zero out wallet
      UPDATE seller_wallets SET 
        available_balance = 0, 
        pending_balance = 0 
      WHERE user_id = p_seller_id;
      
      -- Update profile status
      UPDATE profiles SET account_status = 'banned' WHERE id = p_seller_id;
      
      -- Create deactivation notification
      INSERT INTO strike_notifications (seller_id, strike_id, notification_type, title, message)
      VALUES (
        p_seller_id, v_strike_id, 'account_deactivated',
        'Account Permanently Deactivated',
        'You have received 3 copyright strikes. Your account has been permanently deactivated and all funds have been forfeited.'
      );
    END IF;
  END IF;
  
  -- Recalculate health score
  v_new_health := calculate_seller_health(p_seller_id);
  UPDATE seller_account_health SET 
    health_score = v_new_health,
    last_health_update = now()
  WHERE seller_id = p_seller_id;
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'issue_strike',
    'seller_strike',
    v_strike_id,
    jsonb_build_object(
      'seller_id', p_seller_id,
      'strike_type', p_strike_type,
      'reason', p_reason,
      'active_count', v_active_count,
      'new_health', v_new_health
    )
  );
  
  -- Create strike notification
  INSERT INTO strike_notifications (seller_id, strike_id, notification_type, title, message)
  VALUES (
    p_seller_id,
    v_strike_id,
    'strike_issued',
    CASE p_strike_type 
      WHEN 'community' THEN 'Community Guidelines Strike Issued'
      ELSE 'Copyright Strike Issued'
    END,
    'Strike reason: ' || p_reason || '. Active ' || p_strike_type || ' strikes: ' || v_active_count
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'strike_id', v_strike_id,
    'active_count', v_active_count,
    'new_health', v_new_health
  );
END;
$$;

-- 10. Process Strike Expiry Function (for cron)
CREATE OR REPLACE FUNCTION public.process_strike_expiry()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_copyright INTEGER := 0;
  v_lifted_freezes INTEGER := 0;
  v_seller RECORD;
BEGIN
  -- Expire copyright strikes older than 2 months
  UPDATE seller_strikes
  SET status = 'expired', updated_at = now()
  WHERE strike_type = 'copyright'
    AND status = 'active'
    AND expires_at <= now();
  GET DIAGNOSTICS v_expired_copyright = ROW_COUNT;
  
  -- Lift community freezes after 1 month
  FOR v_seller IN 
    SELECT seller_id FROM seller_account_health
    WHERE is_frozen = true
      AND frozen_until <= now()
      AND is_deactivated = false
  LOOP
    -- Unfreeze account
    UPDATE seller_account_health SET
      is_frozen = false,
      frozen_at = NULL,
      frozen_until = NULL,
      freeze_reason = NULL,
      community_strikes_active = 0,
      updated_at = now()
    WHERE seller_id = v_seller.seller_id;
    
    -- Reset community strikes
    UPDATE seller_strikes SET
      status = 'expired',
      updated_at = now()
    WHERE seller_id = v_seller.seller_id
      AND strike_type = 'community'
      AND status = 'active';
    
    -- Recalculate health
    UPDATE seller_account_health SET
      health_score = calculate_seller_health(v_seller.seller_id)
    WHERE seller_id = v_seller.seller_id;
    
    -- Notify seller
    INSERT INTO strike_notifications (seller_id, notification_type, title, message)
    VALUES (
      v_seller.seller_id,
      'freeze_lifted',
      'Account Freeze Lifted',
      'Your 1-month account freeze has ended. Your community strikes have been reset. Please follow community guidelines going forward.'
    );
    
    v_lifted_freezes := v_lifted_freezes + 1;
  END LOOP;
  
  -- Recalculate health for sellers with expired copyright strikes
  UPDATE seller_account_health SET
    copyright_strikes_active = (
      SELECT COUNT(*) FROM seller_strikes 
      WHERE seller_strikes.seller_id = seller_account_health.seller_id 
        AND strike_type = 'copyright' 
        AND status = 'active'
    ),
    health_score = calculate_seller_health(seller_id),
    last_health_update = now()
  WHERE seller_id IN (
    SELECT DISTINCT seller_id FROM seller_strikes 
    WHERE status = 'expired' AND updated_at > now() - INTERVAL '1 minute'
  );
  
  RETURN jsonb_build_object(
    'expired_copyright_strikes', v_expired_copyright,
    'lifted_freezes', v_lifted_freezes,
    'processed_at', now()
  );
END;
$$;

-- 11. Restore Seller Account Function
CREATE OR REPLACE FUNCTION public.restore_seller_account(
  p_seller_id UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health_record seller_account_health%ROWTYPE;
BEGIN
  SELECT * INTO v_health_record FROM seller_account_health WHERE seller_id = p_seller_id;
  
  IF v_health_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Health record not found');
  END IF;
  
  IF NOT v_health_record.is_deactivated AND NOT v_health_record.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is not frozen or deactivated');
  END IF;
  
  -- Restore account
  UPDATE seller_account_health SET
    is_frozen = false,
    frozen_at = NULL,
    frozen_until = NULL,
    freeze_reason = NULL,
    is_deactivated = false,
    deactivated_at = NULL,
    deactivation_reason = NULL,
    restored_by = auth.uid(),
    restored_at = now(),
    restoration_notes = p_notes,
    community_strikes_active = 0,
    copyright_strikes_active = 0,
    health_score = 100,
    updated_at = now()
  WHERE seller_id = p_seller_id;
  
  -- Reactivate profile
  UPDATE profiles SET account_status = 'active' WHERE id = p_seller_id;
  
  -- Reverse all active strikes
  UPDATE seller_strikes SET
    status = 'reversed',
    reversed_by = auth.uid(),
    reversed_at = now(),
    reversal_reason = p_notes,
    updated_at = now()
  WHERE seller_id = p_seller_id AND status = 'active';
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'restore_account',
    'seller_account_health',
    v_health_record.id,
    jsonb_build_object('seller_id', p_seller_id, 'notes', p_notes)
  );
  
  -- Notify seller
  INSERT INTO strike_notifications (seller_id, notification_type, title, message)
  VALUES (
    p_seller_id,
    'account_restored',
    'Account Restored',
    'Your account has been restored by an administrator. Reason: ' || p_notes
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 12. Reverse Single Strike Function
CREATE OR REPLACE FUNCTION public.reverse_seller_strike(
  p_strike_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strike seller_strikes%ROWTYPE;
  v_new_health INTEGER;
BEGIN
  SELECT * INTO v_strike FROM seller_strikes WHERE id = p_strike_id;
  
  IF v_strike IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Strike not found');
  END IF;
  
  IF v_strike.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Strike is not active');
  END IF;
  
  -- Reverse the strike
  UPDATE seller_strikes SET
    status = 'reversed',
    reversed_by = auth.uid(),
    reversed_at = now(),
    reversal_reason = p_reason,
    updated_at = now()
  WHERE id = p_strike_id;
  
  -- Update cached counts
  IF v_strike.strike_type = 'community' THEN
    UPDATE seller_account_health SET
      community_strikes_active = GREATEST(0, community_strikes_active - 1)
    WHERE seller_id = v_strike.seller_id;
  ELSE
    UPDATE seller_account_health SET
      copyright_strikes_active = GREATEST(0, copyright_strikes_active - 1)
    WHERE seller_id = v_strike.seller_id;
  END IF;
  
  -- Recalculate health
  v_new_health := calculate_seller_health(v_strike.seller_id);
  UPDATE seller_account_health SET
    health_score = v_new_health,
    last_health_update = now()
  WHERE seller_id = v_strike.seller_id;
  
  -- Log activity
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'reverse_strike',
    'seller_strike',
    p_strike_id,
    jsonb_build_object('seller_id', v_strike.seller_id, 'reason', p_reason)
  );
  
  -- Notify seller
  INSERT INTO strike_notifications (seller_id, strike_id, notification_type, title, message)
  VALUES (
    v_strike.seller_id,
    p_strike_id,
    'strike_reversed',
    'Strike Reversed',
    'A ' || v_strike.strike_type || ' strike has been reversed. Reason: ' || p_reason
  );
  
  RETURN jsonb_build_object('success', true, 'new_health', v_new_health);
END;
$$;

-- 13. Submit Strike Appeal Function
CREATE OR REPLACE FUNCTION public.submit_strike_appeal(
  p_strike_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strike seller_strikes%ROWTYPE;
BEGIN
  SELECT * INTO v_strike FROM seller_strikes WHERE id = p_strike_id;
  
  IF v_strike IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Strike not found');
  END IF;
  
  IF v_strike.seller_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  IF v_strike.appeal_status IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appeal already submitted');
  END IF;
  
  UPDATE seller_strikes SET
    appeal_status = 'pending',
    appeal_reason = p_reason,
    appeal_submitted_at = now(),
    updated_at = now()
  WHERE id = p_strike_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 14. Check Seller Can Upload Function
CREATE OR REPLACE FUNCTION public.check_seller_can_upload(p_seller_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health seller_account_health%ROWTYPE;
BEGIN
  SELECT * INTO v_health FROM seller_account_health WHERE seller_id = p_seller_id;
  
  IF v_health IS NULL THEN
    RETURN jsonb_build_object('can_upload', true, 'reason', null);
  END IF;
  
  IF v_health.is_deactivated THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'Account is permanently deactivated');
  END IF;
  
  IF v_health.is_frozen THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'Account is frozen until ' || v_health.frozen_until::date);
  END IF;
  
  IF v_health.copyright_strikes_active >= 2 THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'Upload privileges suspended due to copyright strikes');
  END IF;
  
  RETURN jsonb_build_object('can_upload', true, 'reason', null);
END;
$$;

-- 15. Check Seller Can Withdraw Function
CREATE OR REPLACE FUNCTION public.check_seller_can_withdraw(p_seller_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health seller_account_health%ROWTYPE;
BEGIN
  SELECT * INTO v_health FROM seller_account_health WHERE seller_id = p_seller_id;
  
  IF v_health IS NULL THEN
    RETURN jsonb_build_object('can_withdraw', true, 'reason', null);
  END IF;
  
  IF v_health.is_deactivated THEN
    RETURN jsonb_build_object('can_withdraw', false, 'reason', 'Account is permanently deactivated');
  END IF;
  
  IF v_health.is_frozen THEN
    RETURN jsonb_build_object('can_withdraw', false, 'reason', 'Withdrawals frozen until ' || v_health.frozen_until::date);
  END IF;
  
  RETURN jsonb_build_object('can_withdraw', true, 'reason', null);
END;
$$;