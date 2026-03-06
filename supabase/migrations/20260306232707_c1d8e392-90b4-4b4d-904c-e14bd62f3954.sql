
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(
  p_withdrawal_id uuid,
  p_status text,
  p_notes text DEFAULT NULL,
  p_payment_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_withdrawal withdrawal_requests%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Get the withdrawal request
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- Prevent re-processing
  IF v_withdrawal.status IN ('processed', 'rejected') THEN
    RAISE EXCEPTION 'Withdrawal already % ', v_withdrawal.status;
  END IF;

  -- Update withdrawal request
  UPDATE withdrawal_requests
  SET 
    status = p_status::withdrawal_status,
    notes = COALESCE(p_notes, notes),
    processed_at = CASE WHEN p_status IN ('approved', 'processed') THEN now() ELSE processed_at END,
    payout_details = CASE WHEN p_payment_reference IS NOT NULL THEN jsonb_build_object('reference', p_payment_reference) ELSE payout_details END
  WHERE id = p_withdrawal_id;

  -- If approved or processed, deduct from seller's available balance
  IF p_status IN ('approved', 'processed') THEN
    UPDATE seller_wallets
    SET 
      available_balance = GREATEST(0, COALESCE(available_balance, 0) - v_withdrawal.amount),
      total_withdrawn = COALESCE(total_withdrawn, 0) + v_withdrawal.amount,
      updated_at = now()
    WHERE user_id = v_withdrawal.user_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'status', p_status,
    'amount', v_withdrawal.amount,
    'seller_id', v_withdrawal.user_id
  );

  RETURN v_result;
END;
$function$;
