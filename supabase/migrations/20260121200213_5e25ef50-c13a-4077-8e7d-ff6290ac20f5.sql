-- Add split fee columns to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS song_price numeric DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS platform_fee_total numeric DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS platform_fee_buyer numeric DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS platform_fee_seller numeric DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS buyer_total_paid numeric DEFAULT 0;

-- Add split fee columns to checkout_sessions table
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS platform_fee_buyer numeric DEFAULT 0;
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS platform_fee_seller numeric DEFAULT 0;

-- Add split fee columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS song_price numeric DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform_fee_buyer numeric DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform_fee_seller numeric DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_total_paid numeric DEFAULT 0;

-- Add comment to explain the fee split logic
COMMENT ON COLUMN order_items.platform_fee_buyer IS 'Platform fee portion paid by buyer (50% of total)';
COMMENT ON COLUMN order_items.platform_fee_seller IS 'Platform fee portion deducted from seller (50% of total)';
COMMENT ON COLUMN order_items.buyer_total_paid IS 'Total amount buyer paid (song_price + platform_fee_buyer)';
COMMENT ON COLUMN order_items.song_price IS 'Base song price set by seller';