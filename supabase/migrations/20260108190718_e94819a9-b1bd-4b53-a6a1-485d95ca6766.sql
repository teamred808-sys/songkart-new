-- Add columns to transactions table for fund clearing tracking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_cleared BOOLEAN DEFAULT false;

-- Add columns to withdrawal_requests table for Cashfree payout tracking
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS cashfree_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS cashfree_status TEXT,
ADD COLUMN IF NOT EXISTS cashfree_status_code TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS retries INTEGER DEFAULT 0;

-- Create index for faster queries on uncleared transactions
CREATE INDEX IF NOT EXISTS idx_transactions_pending_clear 
ON public.transactions (seller_id, is_cleared, created_at) 
WHERE is_cleared = false AND payment_status = 'completed';

-- Create function to release cleared funds (7+ days old)
CREATE OR REPLACE FUNCTION public.release_cleared_funds()
RETURNS TABLE(seller_id uuid, released_amount numeric, transaction_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH cleared_transactions AS (
    UPDATE transactions t
    SET is_cleared = true, cleared_at = now()
    WHERE payment_status = 'completed'
      AND is_cleared = false
      AND created_at < (now() - INTERVAL '7 days')
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
$$;

-- Create function to get pending transactions with clearance info for a seller
CREATE OR REPLACE FUNCTION public.get_pending_clearance_info(p_seller_id uuid)
RETURNS TABLE(
  transaction_id uuid,
  amount numeric,
  created_at timestamp with time zone,
  clears_at timestamp with time zone,
  days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.seller_amount,
    t.created_at,
    t.created_at + INTERVAL '7 days' as clears_at,
    GREATEST(0, EXTRACT(DAY FROM (t.created_at + INTERVAL '7 days' - now())))::integer as days_remaining
  FROM transactions t
  WHERE t.seller_id = p_seller_id
    AND t.payment_status = 'completed'
    AND t.is_cleared = false
  ORDER BY t.created_at ASC;
END;
$$;