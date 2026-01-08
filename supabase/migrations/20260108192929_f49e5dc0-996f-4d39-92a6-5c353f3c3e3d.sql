-- Function to allow users to delete their own rating
CREATE OR REPLACE FUNCTION public.delete_my_rating(p_song_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_deleted BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Delete the user's rating for this song
  DELETE FROM song_ratings 
  WHERE song_id = p_song_id AND user_id = v_user_id;
  
  v_deleted := FOUND;
  
  IF v_deleted THEN
    -- Recalculate song rating using existing function
    PERFORM calculate_song_rating(p_song_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'deleted', v_deleted
  );
END;
$$;