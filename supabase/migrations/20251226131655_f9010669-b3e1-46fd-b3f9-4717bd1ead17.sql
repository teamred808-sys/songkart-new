-- Drop existing delete policy on songs
DROP POLICY IF EXISTS "Song owners can delete pending songs" ON public.songs;
DROP POLICY IF EXISTS "Sellers can delete their own songs" ON public.songs;

-- Create new delete policy that allows sellers to delete:
-- 1. Pending songs (not yet approved)
-- 2. Rejected songs
-- 3. Approved songs ONLY if they have no sales (no order_items referencing this song)
CREATE POLICY "Sellers can delete their own songs"
ON public.songs
FOR DELETE
USING (
  auth.uid() = seller_id
  AND (
    -- Allow deleting pending or rejected songs
    status IN ('pending', 'rejected')
    OR (
      -- Allow deleting approved songs only if no sales exist
      status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.order_items oi WHERE oi.song_id = songs.id
      )
    )
  )
);