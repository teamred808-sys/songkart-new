-- Fix foreign key for songs.seller_id to point to profiles instead of auth.users
-- This enables Supabase's embedded select syntax for joining with profiles

-- Drop the existing constraint pointing to auth.users
ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_seller_id_fkey;

-- Add new constraint pointing to profiles
ALTER TABLE public.songs
ADD CONSTRAINT songs_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE SET NULL;