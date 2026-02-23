ALTER TABLE public.songs ADD COLUMN artwork_cropped_url text DEFAULT NULL;
UPDATE public.songs SET artwork_cropped_url = cover_image_url WHERE cover_image_url IS NOT NULL;