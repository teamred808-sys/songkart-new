-- Add SEO fields to songs table for buyer-intent optimization
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS seo_content TEXT; -- 150-250 word crawlable content
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT '{}'; -- YouTube, ads, films, etc.
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS lyrics_intro TEXT; -- 100-150 word context for lyrics
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS no_index BOOLEAN DEFAULT false;

-- Add index for SEO queries
CREATE INDEX IF NOT EXISTS idx_songs_no_index ON public.songs(no_index) WHERE no_index = false;