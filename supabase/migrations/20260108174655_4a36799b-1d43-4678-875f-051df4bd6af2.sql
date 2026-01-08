-- Remove overly permissive INSERT policy and replace with restricted one
DROP POLICY IF EXISTS "System can insert change logs" ON payout_profile_change_logs;

-- Ensure the proper restricted policy exists (created earlier but may have failed)
DROP POLICY IF EXISTS "Authenticated users can insert own change logs" ON payout_profile_change_logs;

CREATE POLICY "Authenticated users can insert own change logs"
  ON payout_profile_change_logs FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = changed_by);