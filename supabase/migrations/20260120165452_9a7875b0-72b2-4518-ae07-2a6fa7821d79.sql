-- Add slug column to songs table (if not exists)
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add username, role and specialties to profiles for seller SEO  
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Create unique indexes (allow NULL values to coexist)
CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_unique_idx ON public.songs (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON public.profiles (username) WHERE username IS NOT NULL;

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(
    regexp_replace(COALESCE(title, ''), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate song slug on insert/update
CREATE OR REPLACE FUNCTION public.set_song_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug(NEW.title);
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'song';
    END IF;
    final_slug := base_slug;
    
    -- Handle duplicates by appending counter
    WHILE EXISTS (SELECT 1 FROM songs WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_song_slug ON songs;
CREATE TRIGGER trigger_set_song_slug
BEFORE INSERT OR UPDATE ON songs
FOR EACH ROW EXECUTE FUNCTION public.set_song_slug();