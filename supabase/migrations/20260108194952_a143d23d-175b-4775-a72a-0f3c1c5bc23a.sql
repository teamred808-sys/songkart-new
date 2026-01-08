-- Create content fingerprints table for tracking audio and lyrics hashes
CREATE TABLE public.content_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  
  -- Audio fingerprinting
  audio_file_hash TEXT,
  audio_duration_ms INTEGER,
  
  -- Lyrics fingerprinting
  lyrics_hash TEXT,
  lyrics_word_count INTEGER,
  
  -- Detection results
  copyright_check_status TEXT DEFAULT 'pending',
  plagiarism_check_status TEXT DEFAULT 'pending',
  
  -- Match details
  audio_match_confidence NUMERIC(5,2),
  audio_match_source TEXT,
  lyrics_similarity_score NUMERIC(5,2),
  similar_song_id UUID REFERENCES songs(id),
  
  -- Review tracking
  checked_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_fingerprints_song ON content_fingerprints(song_id);
CREATE INDEX idx_content_fingerprints_audio_hash ON content_fingerprints(audio_file_hash);
CREATE INDEX idx_content_fingerprints_lyrics_hash ON content_fingerprints(lyrics_hash);
CREATE INDEX idx_content_fingerprints_status ON content_fingerprints(copyright_check_status);

-- Create content review queue table
CREATE TABLE public.content_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  queue_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',
  
  -- Detection results
  detection_type TEXT,
  confidence_score NUMERIC(5,2),
  matched_content TEXT,
  matched_song_id UUID REFERENCES songs(id),
  
  -- Resolution
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_queue_status ON content_review_queue(status, priority);
CREATE INDEX idx_review_queue_song ON content_review_queue(song_id);

-- Add columns to songs table
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS 
  content_check_status TEXT DEFAULT 'pending';

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS
  requires_ownership_proof BOOLEAN DEFAULT false;

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS
  ownership_proof_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.content_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_fingerprints
CREATE POLICY "Admins can manage content fingerprints"
ON public.content_fingerprints
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can view their own fingerprints"
ON public.content_fingerprints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM songs s WHERE s.id = song_id AND s.seller_id = auth.uid()
  )
);

-- RLS policies for content_review_queue
CREATE POLICY "Admins can manage content review queue"
ON public.content_review_queue
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can view their own queue items"
ON public.content_review_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM songs s WHERE s.id = song_id AND s.seller_id = auth.uid()
  )
);