-- Add new columns to songs table for New Uploads system
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS new_uploads_excluded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS new_uploads_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS new_uploads_pinned_until TIMESTAMP WITH TIME ZONE;

-- Backfill approved_at for existing approved songs (use created_at as fallback)
UPDATE public.songs 
SET approved_at = created_at 
WHERE status = 'approved' AND approved_at IS NULL;

-- Create upload rate tracking table
CREATE TABLE IF NOT EXISTS public.seller_upload_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upload_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id)
);

-- Enable RLS on upload rates
ALTER TABLE public.seller_upload_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_upload_rates
CREATE POLICY "Sellers can view their own upload rates"
ON public.seller_upload_rates FOR SELECT
USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage upload rates"
ON public.seller_upload_rates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can insert their own upload rate"
ON public.seller_upload_rates FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own upload rate"
ON public.seller_upload_rates FOR UPDATE
USING (auth.uid() = seller_id);

-- Insert New Uploads platform settings
INSERT INTO public.platform_settings (key, value) VALUES
('new_uploads_visibility_hours', '72'::jsonb),
('new_uploads_max_per_seller', '2'::jsonb),
('new_uploads_upload_rate_limit', '5'::jsonb),
('new_uploads_section_enabled', 'true'::jsonb),
('new_uploads_scoring_weights', '{"freshness": 0.4, "tier": 0.2, "verification": 0.15, "engagement": 0.15, "quality": 0.1}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create the get_new_uploads function for ranking
CREATE OR REPLACE FUNCTION public.get_new_uploads(
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  cover_image_url TEXT,
  preview_audio_url TEXT,
  base_price NUMERIC,
  has_audio BOOLEAN,
  has_lyrics BOOLEAN,
  play_count INTEGER,
  approved_at TIMESTAMP WITH TIME ZONE,
  seller_id UUID,
  seller_name TEXT,
  seller_avatar TEXT,
  seller_verified BOOLEAN,
  seller_tier_level INTEGER,
  seller_tier_name TEXT,
  seller_tier_badge_color TEXT,
  genre_name TEXT,
  mood_name TEXT,
  is_pinned BOOLEAN,
  ranking_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visibility_hours INTEGER;
  v_max_per_seller INTEGER;
  v_weights JSONB;
  v_freshness_weight NUMERIC;
  v_tier_weight NUMERIC;
  v_verification_weight NUMERIC;
  v_engagement_weight NUMERIC;
  v_quality_weight NUMERIC;
BEGIN
  -- Get settings
  SELECT COALESCE((value)::INTEGER, 72) INTO v_visibility_hours
  FROM platform_settings WHERE key = 'new_uploads_visibility_hours';
  
  SELECT COALESCE((value)::INTEGER, 2) INTO v_max_per_seller
  FROM platform_settings WHERE key = 'new_uploads_max_per_seller';
  
  SELECT COALESCE(value, '{"freshness": 0.4, "tier": 0.2, "verification": 0.15, "engagement": 0.15, "quality": 0.1}'::jsonb) INTO v_weights
  FROM platform_settings WHERE key = 'new_uploads_scoring_weights';
  
  v_freshness_weight := COALESCE((v_weights->>'freshness')::NUMERIC, 0.4);
  v_tier_weight := COALESCE((v_weights->>'tier')::NUMERIC, 0.2);
  v_verification_weight := COALESCE((v_weights->>'verification')::NUMERIC, 0.15);
  v_engagement_weight := COALESCE((v_weights->>'engagement')::NUMERIC, 0.15);
  v_quality_weight := COALESCE((v_weights->>'quality')::NUMERIC, 0.1);

  RETURN QUERY
  WITH eligible_songs AS (
    SELECT 
      s.id,
      s.title,
      s.description,
      s.cover_image_url,
      s.preview_audio_url,
      s.base_price,
      s.has_audio,
      s.has_lyrics,
      s.play_count,
      s.approved_at,
      s.seller_id,
      s.new_uploads_pinned,
      s.new_uploads_pinned_until,
      p.full_name AS seller_name,
      p.avatar_url AS seller_avatar,
      COALESCE(p.is_verified, false) AS seller_verified,
      g.name AS genre_name,
      m.name AS mood_name,
      -- Get seller tier info
      COALESCE(sts.current_tier_level, 1) AS tier_level,
      COALESCE(st.name, 'Newbie') AS tier_name,
      COALESCE(st.badge_color, 'slate') AS tier_badge_color,
      -- Calculate freshness score (1.0 for just approved, 0.0 for end of window)
      GREATEST(0, 1.0 - (EXTRACT(EPOCH FROM (now() - s.approved_at)) / (v_visibility_hours * 3600))) AS freshness_score,
      -- Calculate tier score (tier 1 = 1.0, tier 5 = 1.5)
      1.0 + (COALESCE(sts.current_tier_level, 1) - 1) * 0.125 AS tier_score,
      -- Verification bonus
      CASE WHEN COALESCE(p.is_verified, false) THEN 1.2 ELSE 1.0 END AS verification_score,
      -- Engagement score (normalized play count, max 100 for full score)
      LEAST(1.0, COALESCE(s.play_count, 0)::NUMERIC / 100.0) AS engagement_score,
      -- Quality score (has both audio and lyrics = 1.0)
      CASE 
        WHEN COALESCE(s.has_audio, false) AND COALESCE(s.has_lyrics, false) THEN 1.0
        WHEN COALESCE(s.has_audio, false) OR COALESCE(s.has_lyrics, false) THEN 0.5
        ELSE 0.0 
      END AS quality_score,
      -- Row number per seller to enforce max per seller
      ROW_NUMBER() OVER (PARTITION BY s.seller_id ORDER BY s.approved_at DESC) AS seller_row_num
    FROM songs s
    JOIN profiles p ON s.seller_id = p.id
    LEFT JOIN genres g ON s.genre_id = g.id
    LEFT JOIN moods m ON s.mood_id = m.id
    LEFT JOIN seller_tier_status sts ON s.seller_id = sts.seller_id
    LEFT JOIN seller_tiers st ON sts.current_tier_level = st.tier_level
    WHERE s.status = 'approved'
      AND s.approved_at IS NOT NULL
      AND s.approved_at > (now() - (v_visibility_hours || ' hours')::INTERVAL)
      AND COALESCE(s.new_uploads_excluded, false) = false
      AND COALESCE(s.exclusive_sold, false) = false
  ),
  ranked_songs AS (
    SELECT 
      es.*,
      -- Pinned songs get maximum score
      CASE 
        WHEN es.new_uploads_pinned AND (es.new_uploads_pinned_until IS NULL OR es.new_uploads_pinned_until > now())
        THEN 1000.0
        ELSE (
          (es.freshness_score * v_freshness_weight) +
          (es.tier_score * v_tier_weight) +
          (es.verification_score * v_verification_weight) +
          (es.engagement_score * v_engagement_weight) +
          (es.quality_score * v_quality_weight)
        ) * 100
      END AS calculated_score
    FROM eligible_songs es
    WHERE es.seller_row_num <= v_max_per_seller
  )
  SELECT 
    rs.id,
    rs.title,
    rs.description,
    rs.cover_image_url,
    rs.preview_audio_url,
    rs.base_price,
    rs.has_audio,
    rs.has_lyrics,
    rs.play_count,
    rs.approved_at,
    rs.seller_id,
    rs.seller_name,
    rs.seller_avatar,
    rs.seller_verified,
    rs.tier_level,
    rs.tier_name,
    rs.tier_badge_color,
    rs.genre_name,
    rs.mood_name,
    (rs.new_uploads_pinned AND (rs.new_uploads_pinned_until IS NULL OR rs.new_uploads_pinned_until > now())) AS is_pinned,
    rs.calculated_score AS ranking_score
  FROM ranked_songs rs
  ORDER BY rs.calculated_score DESC, rs.approved_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to check upload rate limit
CREATE OR REPLACE FUNCTION public.check_upload_rate_limit(p_seller_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limit INTEGER;
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get rate limit setting
  SELECT COALESCE((value)::INTEGER, 5) INTO v_rate_limit
  FROM platform_settings WHERE key = 'new_uploads_upload_rate_limit';
  
  -- Get or create upload rate record
  SELECT upload_count, window_start INTO v_current_count, v_window_start
  FROM seller_upload_rates WHERE seller_id = p_seller_id;
  
  IF NOT FOUND THEN
    INSERT INTO seller_upload_rates (seller_id, upload_count, window_start)
    VALUES (p_seller_id, 0, now())
    RETURNING upload_count, window_start INTO v_current_count, v_window_start;
  END IF;
  
  -- Reset window if 24 hours have passed
  IF v_window_start < (now() - INTERVAL '24 hours') THEN
    UPDATE seller_upload_rates 
    SET upload_count = 0, window_start = now(), updated_at = now()
    WHERE seller_id = p_seller_id;
    v_current_count := 0;
  END IF;
  
  -- Check if limit exceeded
  IF v_current_count >= v_rate_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'limit', v_rate_limit,
      'resets_at', v_window_start + INTERVAL '24 hours',
      'message', format('You have reached your upload limit of %s songs per 24 hours. Please try again later.', v_rate_limit)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'limit', v_rate_limit,
    'remaining', v_rate_limit - v_current_count
  );
END;
$$;

-- Function to increment upload count
CREATE OR REPLACE FUNCTION public.increment_upload_count(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO seller_upload_rates (seller_id, upload_count, window_start)
  VALUES (p_seller_id, 1, now())
  ON CONFLICT (seller_id) DO UPDATE
  SET upload_count = CASE 
    WHEN seller_upload_rates.window_start < (now() - INTERVAL '24 hours') THEN 1
    ELSE seller_upload_rates.upload_count + 1
  END,
  window_start = CASE 
    WHEN seller_upload_rates.window_start < (now() - INTERVAL '24 hours') THEN now()
    ELSE seller_upload_rates.window_start
  END,
  updated_at = now();
END;
$$;

-- Admin function to pin/exclude songs from New Uploads
CREATE OR REPLACE FUNCTION public.admin_manage_new_upload(
  p_song_id UUID,
  p_action TEXT,
  p_pin_until TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_action = 'pin' THEN
    UPDATE songs SET 
      new_uploads_pinned = true, 
      new_uploads_pinned_until = p_pin_until,
      new_uploads_excluded = false
    WHERE id = p_song_id;
    RETURN jsonb_build_object('success', true, 'action', 'pinned');
    
  ELSIF p_action = 'unpin' THEN
    UPDATE songs SET 
      new_uploads_pinned = false, 
      new_uploads_pinned_until = NULL
    WHERE id = p_song_id;
    RETURN jsonb_build_object('success', true, 'action', 'unpinned');
    
  ELSIF p_action = 'exclude' THEN
    UPDATE songs SET 
      new_uploads_excluded = true,
      new_uploads_pinned = false,
      new_uploads_pinned_until = NULL
    WHERE id = p_song_id;
    RETURN jsonb_build_object('success', true, 'action', 'excluded');
    
  ELSIF p_action = 'include' THEN
    UPDATE songs SET new_uploads_excluded = false
    WHERE id = p_song_id;
    RETURN jsonb_build_object('success', true, 'action', 'included');
    
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$;