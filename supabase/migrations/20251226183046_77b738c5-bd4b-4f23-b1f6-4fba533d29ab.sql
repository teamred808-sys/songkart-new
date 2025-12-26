-- Add preview_status column with default 'pending' for new uploads
-- Add preview_error column for storing failure messages
-- This supports retry without re-upload

ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS preview_status text DEFAULT 'pending' CHECK (preview_status IN ('pending', 'generating', 'ready', 'failed'));

ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS preview_error text;

-- Add index for efficient filtering by preview status
CREATE INDEX IF NOT EXISTS idx_songs_preview_status ON public.songs(preview_status);

-- Set existing songs with previews to 'ready' status
UPDATE public.songs 
SET preview_status = 'ready' 
WHERE preview_audio_url IS NOT NULL AND preview_status = 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.songs.preview_status IS 'Server-side preview generation status: pending, generating, ready, failed';
COMMENT ON COLUMN public.songs.preview_error IS 'Error message if preview generation failed';