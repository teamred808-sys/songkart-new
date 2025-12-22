-- Fix RLS on genres table
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Fix RLS on moods table  
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_view_count(song_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.songs SET view_count = view_count + 1 WHERE id = song_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_play_count(song_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.songs SET play_count = play_count + 1 WHERE id = song_uuid;
END;
$$;