-- Create song_ratings table
CREATE TABLE public.song_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- Create rating_abuse_flags table for admin moderation
CREATE TABLE public.rating_abuse_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES public.song_ratings(id) ON DELETE CASCADE,
  flagged_by UUID REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add cached rating columns to songs table
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.song_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_abuse_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for song_ratings
CREATE POLICY "Anyone can view ratings"
ON public.song_ratings FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert ratings"
ON public.song_ratings FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.songs WHERE id = song_id AND seller_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own ratings"
ON public.song_ratings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ratings"
ON public.song_ratings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for rating_abuse_flags
CREATE POLICY "Admins can manage abuse flags"
ON public.rating_abuse_flags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to calculate and update song rating
CREATE OR REPLACE FUNCTION public.calculate_song_rating(p_song_id UUID)
RETURNS TABLE(avg_rating NUMERIC, total_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg NUMERIC(2,1);
  v_count INTEGER;
BEGIN
  -- Calculate weighted average (verified purchases count 1.5x)
  SELECT 
    ROUND(
      COALESCE(
        SUM(CASE WHEN is_verified_purchase THEN rating * 1.5 ELSE rating END) /
        NULLIF(SUM(CASE WHEN is_verified_purchase THEN 1.5 ELSE 1 END), 0),
        0
      ),
      1
    ),
    COUNT(*)
  INTO v_avg, v_count
  FROM song_ratings
  WHERE song_id = p_song_id;

  -- Update cached values on songs table
  UPDATE songs
  SET average_rating = v_avg, total_ratings = v_count
  WHERE id = p_song_id;

  RETURN QUERY SELECT v_avg, v_count;
END;
$$;

-- Function to submit or update a rating with anti-abuse checks
CREATE OR REPLACE FUNCTION public.submit_rating(
  p_song_id UUID,
  p_rating INTEGER,
  p_ip_address TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_seller_id UUID;
  v_is_verified_purchase BOOLEAN;
  v_recent_rating_count INTEGER;
  v_existing_rating_id UUID;
  v_result RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Validate rating value
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  -- Check if user is the seller (prevent self-rating)
  SELECT seller_id INTO v_seller_id FROM songs WHERE id = p_song_id;
  
  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Song not found');
  END IF;
  
  IF v_seller_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot rate your own content');
  END IF;

  -- Rate limiting: max 10 ratings per hour
  SELECT COUNT(*) INTO v_recent_rating_count
  FROM song_ratings
  WHERE user_id = v_user_id
    AND created_at > (now() - INTERVAL '1 hour');
  
  IF v_recent_rating_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please try again later.');
  END IF;

  -- Check if user has purchased this song (verified purchase)
  SELECT EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.song_id = p_song_id
      AND o.buyer_id = v_user_id
      AND o.payment_status = 'completed'
  ) INTO v_is_verified_purchase;

  -- Check for existing rating
  SELECT id INTO v_existing_rating_id
  FROM song_ratings
  WHERE song_id = p_song_id AND user_id = v_user_id;

  IF v_existing_rating_id IS NOT NULL THEN
    -- Update existing rating
    UPDATE song_ratings
    SET rating = p_rating,
        updated_at = now(),
        ip_address = COALESCE(p_ip_address, ip_address),
        device_fingerprint = COALESCE(p_device_fingerprint, device_fingerprint)
    WHERE id = v_existing_rating_id;
  ELSE
    -- Insert new rating
    INSERT INTO song_ratings (song_id, user_id, rating, is_verified_purchase, ip_address, device_fingerprint)
    VALUES (p_song_id, v_user_id, p_rating, v_is_verified_purchase, p_ip_address, p_device_fingerprint);
  END IF;

  -- Recalculate song rating
  SELECT * INTO v_result FROM calculate_song_rating(p_song_id);

  RETURN jsonb_build_object(
    'success', true,
    'rating', p_rating,
    'is_update', v_existing_rating_id IS NOT NULL,
    'is_verified_purchase', v_is_verified_purchase,
    'average_rating', v_result.avg_rating,
    'total_ratings', v_result.total_count
  );
END;
$$;

-- Function to get paginated ratings for a song
CREATE OR REPLACE FUNCTION public.get_song_ratings(
  p_song_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  rating INTEGER,
  is_verified_purchase BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.rating,
    sr.is_verified_purchase,
    sr.created_at,
    sr.updated_at,
    sr.user_id,
    p.full_name,
    p.avatar_url
  FROM song_ratings sr
  JOIN profiles p ON p.id = sr.user_id
  WHERE sr.song_id = p_song_id
  ORDER BY sr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to delete a rating (admin only)
CREATE OR REPLACE FUNCTION public.admin_remove_rating(
  p_rating_id UUID,
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_rating RECORD;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT has_role(v_admin_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get rating details before deletion
  SELECT * INTO v_rating FROM song_ratings WHERE id = p_rating_id;
  
  IF v_rating IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating not found');
  END IF;

  -- Log the action
  INSERT INTO activity_logs (user_id, entity_type, entity_id, action, metadata)
  VALUES (v_admin_id, 'song_rating', p_rating_id, 'delete', jsonb_build_object(
    'reason', p_reason,
    'song_id', v_rating.song_id,
    'rating_user_id', v_rating.user_id,
    'rating_value', v_rating.rating
  ));

  -- Delete the rating
  DELETE FROM song_ratings WHERE id = p_rating_id;

  -- Recalculate song rating
  PERFORM calculate_song_rating(v_rating.song_id);

  RETURN jsonb_build_object('success', true, 'message', 'Rating removed');
END;
$$;

-- Function to flag a rating for review
CREATE OR REPLACE FUNCTION public.flag_rating(
  p_rating_id UUID,
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Check if rating exists
  IF NOT EXISTS (SELECT 1 FROM song_ratings WHERE id = p_rating_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating not found');
  END IF;

  -- Check if already flagged by this user
  IF EXISTS (SELECT 1 FROM rating_abuse_flags WHERE rating_id = p_rating_id AND flagged_by = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already flagged this rating');
  END IF;

  INSERT INTO rating_abuse_flags (rating_id, flagged_by, reason)
  VALUES (p_rating_id, v_user_id, p_reason);

  RETURN jsonb_build_object('success', true, 'message', 'Rating flagged for review');
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON public.song_ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_user_id ON public.song_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_created_at ON public.song_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rating_abuse_flags_status ON public.rating_abuse_flags(status);
CREATE INDEX IF NOT EXISTS idx_songs_average_rating ON public.songs(average_rating DESC NULLS LAST);