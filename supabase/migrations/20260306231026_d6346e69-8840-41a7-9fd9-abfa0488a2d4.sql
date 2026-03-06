
-- Update release_cleared_funds to read payment_hold_days from platform_settings
CREATE OR REPLACE FUNCTION public.release_cleared_funds()
 RETURNS TABLE(seller_id uuid, released_amount numeric, transaction_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hold_days INTEGER;
BEGIN
  -- Read configurable hold period from platform_settings
  SELECT COALESCE((value->>'days')::INTEGER, 7) INTO v_hold_days
  FROM platform_settings WHERE key = 'payment_hold_days';
  
  v_hold_days := COALESCE(v_hold_days, 7);

  RETURN QUERY
  WITH cleared_transactions AS (
    UPDATE transactions t
    SET is_cleared = true, cleared_at = now()
    WHERE payment_status = 'completed'
      AND is_cleared = false
      AND created_at < (now() - (v_hold_days || ' days')::INTERVAL)
    RETURNING t.seller_id, t.seller_amount
  ),
  aggregated AS (
    SELECT 
      ct.seller_id,
      SUM(ct.seller_amount) as total_amount,
      COUNT(*)::integer as tx_count
    FROM cleared_transactions ct
    GROUP BY ct.seller_id
  ),
  wallet_updates AS (
    UPDATE seller_wallets w
    SET 
      pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - a.total_amount),
      available_balance = COALESCE(available_balance, 0) + a.total_amount,
      updated_at = now()
    FROM aggregated a
    WHERE w.user_id = a.seller_id
    RETURNING a.seller_id, a.total_amount, a.tx_count
  )
  SELECT wu.seller_id, wu.total_amount, wu.tx_count
  FROM wallet_updates wu;
END;
$function$;

-- Update get_pending_clearance_info to read payment_hold_days from platform_settings
CREATE OR REPLACE FUNCTION public.get_pending_clearance_info(p_seller_id uuid)
 RETURNS TABLE(transaction_id uuid, amount numeric, created_at timestamp with time zone, clears_at timestamp with time zone, days_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hold_days INTEGER;
BEGIN
  SELECT COALESCE((value->>'days')::INTEGER, 7) INTO v_hold_days
  FROM platform_settings WHERE key = 'payment_hold_days';
  
  v_hold_days := COALESCE(v_hold_days, 7);

  RETURN QUERY
  SELECT 
    t.id,
    t.seller_amount,
    t.created_at,
    t.created_at + (v_hold_days || ' days')::INTERVAL as clears_at,
    GREATEST(0, EXTRACT(DAY FROM (t.created_at + (v_hold_days || ' days')::INTERVAL - now())))::integer as days_remaining
  FROM transactions t
  WHERE t.seller_id = p_seller_id
    AND t.payment_status = 'completed'
    AND t.is_cleared = false
  ORDER BY t.created_at ASC;
END;
$function$;

-- Create instant_release_seller_funds function
CREATE OR REPLACE FUNCTION public.instant_release_seller_funds(p_seller_id uuid)
 RETURNS TABLE(released_amount numeric, transaction_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH cleared_transactions AS (
    UPDATE transactions t
    SET is_cleared = true, cleared_at = now()
    WHERE seller_id = p_seller_id
      AND payment_status = 'completed'
      AND is_cleared = false
    RETURNING t.seller_amount
  ),
  aggregated AS (
    SELECT 
      SUM(ct.seller_amount) as total_amount,
      COUNT(*)::integer as tx_count
    FROM cleared_transactions ct
  ),
  wallet_update AS (
    UPDATE seller_wallets w
    SET 
      pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - a.total_amount),
      available_balance = COALESCE(available_balance, 0) + a.total_amount,
      updated_at = now()
    FROM aggregated a
    WHERE w.user_id = p_seller_id
      AND a.total_amount > 0
    RETURNING a.total_amount, a.tx_count
  )
  SELECT wu.total_amount, wu.tx_count
  FROM wallet_update wu;
END;
$function$;
