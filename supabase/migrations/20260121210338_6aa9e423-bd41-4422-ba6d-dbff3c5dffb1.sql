-- First, resolve existing duplicates by appending email prefix to non-first occurrences
WITH duplicate_ids AS (
  SELECT id, full_name, email,
    ROW_NUMBER() OVER (PARTITION BY LOWER(full_name) ORDER BY created_at) as rn
  FROM profiles
  WHERE full_name IS NOT NULL AND full_name != ''
)
UPDATE profiles p
SET full_name = d.full_name || '_' || SUBSTRING(d.email FROM 1 FOR 4)
FROM duplicate_ids d
WHERE p.id = d.id AND d.rn > 1;

-- Create case-insensitive unique index on full_name
CREATE UNIQUE INDEX profiles_full_name_unique_idx 
ON public.profiles (LOWER(full_name)) 
WHERE full_name IS NOT NULL AND full_name != '';

-- Create function to check display name availability
CREATE OR REPLACE FUNCTION public.is_display_name_available(p_name TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(full_name) = LOWER(p_name)
      AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      AND full_name IS NOT NULL 
      AND full_name != ''
  )
$$;

-- Update handle_new_user trigger to ensure unique display names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  selected_role app_role;
  display_name TEXT;
  base_name TEXT;
  suffix_num INTEGER := 0;
BEGIN
  selected_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::app_role, 
    'buyer'
  );
  
  -- Get base name from metadata or email
  base_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), SPLIT_PART(NEW.email, '@', 1));
  display_name := base_name;
  
  -- Check if name is unique, append suffix if not
  WHILE NOT is_display_name_available(display_name, NULL) LOOP
    suffix_num := suffix_num + 1;
    display_name := base_name || suffix_num::TEXT;
  END LOOP;
  
  -- Create profile with unique name
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, display_name);
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, selected_role);
  
  -- Create wallet for sellers
  IF selected_role = 'seller' THEN
    INSERT INTO public.seller_wallets (user_id) VALUES (NEW.id);
    INSERT INTO public.seller_account_health (seller_id) VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;