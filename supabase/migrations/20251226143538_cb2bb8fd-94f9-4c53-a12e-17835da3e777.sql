-- Add preview metadata fields to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS preview_generated_at TIMESTAMPTZ;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS preview_duration_seconds INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS preview_file_size_bytes INTEGER;

-- Create index for quick preview status checks
CREATE INDEX IF NOT EXISTS idx_songs_preview_status 
ON songs(preview_audio_url, preview_generated_at) 
WHERE has_audio = true;

-- Add comment for documentation
COMMENT ON COLUMN songs.preview_generated_at IS 'Timestamp when preview was auto-generated';
COMMENT ON COLUMN songs.preview_duration_seconds IS 'Duration of the preview audio in seconds';
COMMENT ON COLUMN songs.preview_file_size_bytes IS 'File size of the preview audio in bytes';