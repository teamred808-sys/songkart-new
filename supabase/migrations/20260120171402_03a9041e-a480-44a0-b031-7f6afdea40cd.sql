-- Fix SECURITY DEFINER view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  role,
  is_verified,
  social_links,
  specialties,
  website,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;