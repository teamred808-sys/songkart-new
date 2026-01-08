-- Add foreign key constraint from seller_payout_profiles to profiles
-- This enables PostgREST to infer the relationship for joins

ALTER TABLE public.seller_payout_profiles 
ADD CONSTRAINT fk_seller_payout_profiles_seller 
FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;