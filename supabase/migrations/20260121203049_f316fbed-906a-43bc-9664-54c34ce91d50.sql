-- Create song_views table for tracking authenticated, engagement-based views
CREATE TABLE public.song_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  playback_duration_seconds INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT
);

-- Index for fast lookups and uniqueness enforcement
CREATE INDEX idx_song_views_user_song_date ON song_views(user_id, song_id, viewed_at);
CREATE INDEX idx_song_views_song_id ON song_views(song_id);
CREATE INDEX idx_song_views_user_id ON song_views(user_id);

-- Enable RLS
ALTER TABLE song_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own view history"
ON song_views FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert views"
ON song_views FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all song views"
ON song_views FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create server-side view recording function
-- This function enforces all view counting rules in one atomic operation
CREATE OR REPLACE FUNCTION public.record_song_view(
  p_song_id UUID,
  p_playback_seconds INTEGER DEFAULT 0,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_seller_id UUID;
  v_is_admin BOOLEAN;
  v_min_playback INTEGER := 5; -- Minimum 5 seconds
  v_last_view TIMESTAMPTZ;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Rule 1: Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;
  
  -- Rule 2: Check if user is admin (admins don't count)
  IF has_role(v_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'admin_excluded');
  END IF;
  
  -- Rule 3: Check if user is the seller (sellers can't inflate own views)
  SELECT seller_id INTO v_seller_id FROM songs WHERE id = p_song_id;
  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'song_not_found');
  END IF;
  IF v_seller_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'seller_excluded');
  END IF;
  
  -- Rule 4: Enforce minimum playback duration
  IF p_playback_seconds < v_min_playback THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_playback', 'required', v_min_playback);
  END IF;
  
  -- Rule 5: Check for duplicate view within 24 hours
  SELECT viewed_at INTO v_last_view
  FROM song_views
  WHERE user_id = v_user_id 
    AND song_id = p_song_id 
    AND viewed_at > now() - INTERVAL '24 hours'
  ORDER BY viewed_at DESC
  LIMIT 1;
  
  IF v_last_view IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'duplicate_within_24h', 'last_view', v_last_view);
  END IF;
  
  -- All checks passed - record the view
  INSERT INTO song_views (user_id, song_id, playback_duration_seconds, ip_address, user_agent, device_fingerprint)
  VALUES (v_user_id, p_song_id, p_playback_seconds, p_ip_address, p_user_agent, p_device_fingerprint);
  
  -- Increment the cached view count on songs table
  UPDATE songs SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_song_id;
  
  RETURN jsonb_build_object('success', true, 'reason', 'view_recorded');
END;
$$;