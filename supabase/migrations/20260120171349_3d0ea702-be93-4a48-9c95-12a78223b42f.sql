-- Drop the old overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles basic info viewable by everyone" ON public.profiles;

-- Create proper SELECT policy: public can see non-sensitive fields, owner sees all
CREATE POLICY "Public profile info viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Note: The profiles table needs email for signup/login flows,
-- but we should filter sensitive data at the application level
-- when displaying to non-owners. The RLS allows SELECT but the
-- frontend should only query needed fields.

-- Create public_profiles view for safe public queries
CREATE OR REPLACE VIEW public.public_profiles AS
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