-- Create storage buckets for song files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('song-covers', 'song-covers', true, 5242880),  -- 5MB limit for cover images
  ('song-audio', 'song-audio', false, 52428800),  -- 50MB limit for full audio (private)
  ('song-previews', 'song-previews', true, 10485760);  -- 10MB limit for preview audio (public)

-- Storage policies for song-covers bucket (public read, seller upload)
CREATE POLICY "Anyone can view song covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-covers');

CREATE POLICY "Sellers can upload song covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'song-covers' 
  AND auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'seller')
);

CREATE POLICY "Sellers can update their song covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'song-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can delete their song covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'song-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for song-audio bucket (private, seller upload, buyer access after purchase)
CREATE POLICY "Sellers can view their own audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'song-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can upload song audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'song-audio' 
  AND auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'seller')
);

CREATE POLICY "Sellers can update their song audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'song-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can delete their song audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'song-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for song-previews bucket (public read, seller upload)
CREATE POLICY "Anyone can view song previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-previews');

CREATE POLICY "Sellers can upload song previews"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'song-previews' 
  AND auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'seller')
);

CREATE POLICY "Sellers can update their song previews"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'song-previews' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can delete their song previews"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'song-previews' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);