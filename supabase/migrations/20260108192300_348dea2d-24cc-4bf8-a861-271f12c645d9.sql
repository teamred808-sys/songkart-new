-- Create validation function for withdrawal requests
CREATE OR REPLACE FUNCTION public.validate_withdrawal_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available_balance NUMERIC;
  v_min_withdrawal NUMERIC;
BEGIN
  -- Get seller's available balance
  SELECT available_balance INTO v_available_balance
  FROM seller_wallets
  WHERE user_id = NEW.user_id;
  
  -- Get platform minimum withdrawal setting
  SELECT (value->>'amount')::NUMERIC INTO v_min_withdrawal
  FROM platform_settings
  WHERE key = 'min_withdrawal';
  
  -- Default to 500 if not set
  v_min_withdrawal := COALESCE(v_min_withdrawal, 500);
  
  -- Validate minimum amount
  IF NEW.amount < v_min_withdrawal THEN
    RAISE EXCEPTION 'Withdrawal amount must be at least ₹%', v_min_withdrawal;
  END IF;
  
  -- Validate against available balance
  IF NEW.amount > COALESCE(v_available_balance, 0) THEN
    RAISE EXCEPTION 'Withdrawal amount exceeds available balance';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_validate_withdrawal_request ON public.withdrawal_requests;

-- Create trigger for validation
CREATE TRIGGER trg_validate_withdrawal_request
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_withdrawal_request();