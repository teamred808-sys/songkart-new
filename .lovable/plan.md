

## Update Artwork Rendering to Use Cropped 512x512 Image

### Summary
Add a new `artwork_cropped_url` column to the `songs` table. During upload, populate it with the cropped 512x512 image URL (same as `cover_image_url` since the crop flow already produces 512x512). Update all display components to prefer `artwork_cropped_url` with fallback to `cover_image_url` using `object-fit: cover` and `aspect-ratio: 1/1` where applicable.

### Database Change
**Migration: Add `artwork_cropped_url` column to `songs` table**
```sql
ALTER TABLE songs ADD COLUMN artwork_cropped_url text DEFAULT NULL;
-- Backfill existing songs: set artwork_cropped_url = cover_image_url for all songs
UPDATE songs SET artwork_cropped_url = cover_image_url WHERE cover_image_url IS NOT NULL;
```

### Upload Change (minimal -- DB field only)
**File: `src/pages/seller/UploadSong.tsx` (line ~340)**
- Add `artwork_cropped_url: cover_image_url` to the insert object (the image is already 512x512 from the crop flow)

### Song Interface Update
**File: `src/hooks/useSongs.ts` (line 17)**
- Add `artwork_cropped_url: string | null` to the `Song` interface

### Display Component Updates
Create a helper or use inline pattern across all components:
```typescript
const artworkUrl = song.artwork_cropped_url || song.cover_image_url;
```

**Files to update (rendering `cover_image_url` to prefer `artwork_cropped_url`):**

1. **`src/components/songs/SongCard.tsx` (line 130)**
   - Accept new prop `croppedCoverUrl?: string | null`
   - Use `croppedCoverUrl || coverUrl` as the image source
   - Add `style={{ aspectRatio: '1/1', objectFit: 'cover' }}` on desktop view

2. **`src/components/home/FeaturedSongs.tsx` (line 55)**
   - Pass `croppedCoverUrl={song.artwork_cropped_url}` to SongCard

3. **`src/pages/Browse.tsx` (line 150)**
   - Pass `croppedCoverUrl` to SongCard

4. **`src/pages/SongDetail.tsx` (lines 137, 159, 171, 209-211)**
   - Use `artwork_cropped_url || cover_image_url` for hero image and schema data
   - Apply `object-fit: cover; aspect-ratio: 1/1` on the hero image container

5. **`src/pages/SellerProfile.tsx` (line 35)**
   - Add `artwork_cropped_url` to Song interface and query select
   - Pass to SongCard

6. **`src/components/cart/CartItemCard.tsx` (line 70-73)**
   - Use `artwork_cropped_url || cover_image_url` for thumbnail
   - Add `object-fit: cover` (already present) and `aspect-ratio: 1/1` styles

7. **`src/pages/buyer/Favorites.tsx` (lines 85-88)**
   - Use `artwork_cropped_url || cover_image_url` for favorite song image

8. **`src/pages/seller/MySongs.tsx` (line 340)**
   - Use `artwork_cropped_url || cover_image_url` for song avatar

9. **`src/pages/seller/SalesOrders.tsx` (line 214)**
   - Use `artwork_cropped_url || cover_image_url` for order thumbnail

10. **`src/pages/seller/Analytics.tsx` (line 235)**
    - Use `artwork_cropped_url || cover_image_url` for analytics thumbnail

11. **`src/pages/buyer/BuyerDashboard.tsx`**
    - Update song thumbnail references to prefer cropped URL

12. **`src/pages/buyer/MyPurchases.tsx` / `src/pages/buyer/MyDownloads.tsx`**
    - Update song image references to prefer cropped URL

13. **`src/components/cart/MiniCartDropdown.tsx`**
    - Update thumbnail to prefer cropped URL

### Query Updates
All hooks that select song data need to include `artwork_cropped_url` in their select statements:

- **`src/hooks/useSongs.ts`** -- all query functions (useSongs, useFeaturedSongs, useSong, etc.)
- **`src/hooks/useBuyerData.ts`** -- cart, purchases, downloads, favorites queries
- **`src/hooks/useSellerData.ts`** -- seller songs queries
- **`src/hooks/useNewUploads.ts`** -- new uploads query
- **`src/pages/SellerProfile.tsx`** -- seller profile songs query

### Fallback CSS Pattern
For all image containers, apply:
```css
object-fit: cover;
aspect-ratio: 1 / 1;
```
This prevents stretching when an old non-square `cover_image_url` is used as fallback.

### What stays unchanged
- Upload UI layout, crop modal, storage mechanism
- Publishing flow
- Original `cover_image_url` column (kept, not deleted)
- Original images in storage (not deleted)
- Order history structure
- Existing order thumbnails (backfill ensures they work)

