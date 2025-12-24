-- Add unique constraint for upsert functionality (allows fast client-side add to cart)
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_user_song_unique 
UNIQUE (user_id, song_id);