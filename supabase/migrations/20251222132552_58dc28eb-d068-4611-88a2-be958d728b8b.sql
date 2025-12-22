
-- Make seller_id nullable to allow sample data insertion
ALTER TABLE songs ALTER COLUMN seller_id DROP NOT NULL;
