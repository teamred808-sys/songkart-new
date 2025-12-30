-- Function to check if buyer already owns a specific license tier for a song
CREATE OR REPLACE FUNCTION check_existing_purchase(
  p_buyer_id uuid,
  p_song_id uuid,
  p_license_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.buyer_id = p_buyer_id
      AND oi.song_id = p_song_id
      AND oi.license_type = p_license_type
      AND o.payment_status = 'paid'
  );
END;
$$;