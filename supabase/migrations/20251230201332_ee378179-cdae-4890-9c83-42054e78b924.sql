-- Payout verification status enum
CREATE TYPE public.payout_verification_status AS ENUM ('not_added', 'pending', 'verified', 'rejected');

-- Main payout profiles table
CREATE TABLE public.seller_payout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE,
  
  -- Bank details
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  account_number_last4 TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'savings',
  country TEXT NOT NULL DEFAULT 'India',
  currency TEXT NOT NULL DEFAULT 'INR',
  
  -- Optional UPI (for India)
  upi_id TEXT,
  
  -- Verification status
  verification_status public.payout_verification_status NOT NULL DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Lock during withdrawal processing
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_reason TEXT
);

-- Audit log for payout changes
CREATE TABLE public.payout_profile_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  change_type TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  changed_by UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payout_profiles_seller ON public.seller_payout_profiles(seller_id);
CREATE INDEX idx_payout_profiles_status ON public.seller_payout_profiles(verification_status);
CREATE INDEX idx_payout_change_logs_seller ON public.payout_profile_change_logs(seller_id);

-- Enable RLS
ALTER TABLE public.seller_payout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_profile_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_payout_profiles
CREATE POLICY "Sellers can view own payout profile"
  ON public.seller_payout_profiles FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert own payout profile"
  ON public.seller_payout_profiles FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own payout profile when not locked"
  ON public.seller_payout_profiles FOR UPDATE
  USING (auth.uid() = seller_id AND is_locked = false);

CREATE POLICY "Admins can manage all payout profiles"
  ON public.seller_payout_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS Policies for change logs
CREATE POLICY "Users can view relevant change logs"
  ON public.payout_profile_change_logs FOR SELECT
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "System can insert change logs"
  ON public.payout_profile_change_logs FOR INSERT
  WITH CHECK (true);

-- Function to check if seller can withdraw
CREATE OR REPLACE FUNCTION public.can_seller_withdraw(p_seller_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_pending_withdrawal BOOLEAN;
BEGIN
  SELECT * INTO v_profile 
  FROM seller_payout_profiles 
  WHERE seller_id = p_seller_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'no_payout_profile',
      'message', 'Please add your bank details to enable withdrawals.'
    );
  END IF;
  
  IF v_profile.verification_status != 'verified' THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'not_verified',
      'status', v_profile.verification_status::text,
      'message', 'Your bank details are pending verification. Withdrawals will be enabled once verified.'
    );
  END IF;
  
  IF v_profile.is_locked THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'profile_locked',
      'message', 'Your payout profile is currently locked. ' || COALESCE(v_profile.locked_reason, 'Please contact support.')
    );
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM withdrawal_requests 
    WHERE user_id = p_seller_id AND status IN ('pending', 'approved')
  ) INTO v_pending_withdrawal;
  
  RETURN jsonb_build_object(
    'can_withdraw', true,
    'has_pending_withdrawal', v_pending_withdrawal,
    'account_last4', v_profile.account_number_last4,
    'bank_name', v_profile.bank_name
  );
END;
$$;

-- Function to log payout profile changes
CREATE OR REPLACE FUNCTION public.log_payout_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO payout_profile_change_logs (seller_id, change_type, new_values, changed_by)
    VALUES (NEW.seller_id, 'created', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reset verification status if bank details change
    IF OLD.account_number_encrypted != NEW.account_number_encrypted 
       OR OLD.ifsc_code != NEW.ifsc_code
       OR OLD.bank_name != NEW.bank_name THEN
      NEW.verification_status := 'pending';
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
      NEW.rejection_reason := NULL;
    END IF;
    
    INSERT INTO payout_profile_change_logs (seller_id, change_type, previous_values, new_values, changed_by)
    VALUES (NEW.seller_id, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for change logging
CREATE TRIGGER payout_profile_change_trigger
  BEFORE INSERT OR UPDATE ON public.seller_payout_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payout_change();

-- Auto-update updated_at
CREATE TRIGGER update_payout_profile_updated_at
  BEFORE UPDATE ON public.seller_payout_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();