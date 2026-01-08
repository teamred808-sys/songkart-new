-- Fix overly permissive RLS policies - drop and recreate to avoid duplicates

-- Drop existing policies first
DROP POLICY IF EXISTS "Sellers can view their own tier history" ON seller_tier_history;
DROP POLICY IF EXISTS "Admins can manage tier history" ON seller_tier_history;
DROP POLICY IF EXISTS "Anyone can insert tier history" ON seller_tier_history;
DROP POLICY IF EXISTS "System can insert tier history" ON seller_tier_history;

-- Create proper restricted policies for seller_tier_history
CREATE POLICY "Sellers can view their own tier history"
  ON seller_tier_history FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage tier history"
  ON seller_tier_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );