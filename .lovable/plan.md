

## Fix Song Detail Hero Image to Display in 1:1 Ratio

### Problem
The Song Detail page hero image container uses `aspect-video` (16:9 ratio) instead of `aspect-square` (1:1 ratio). Even though the image has `style={{ aspectRatio: '1/1' }}`, the parent container stretches it to 16:9, showing the artwork in its original non-square proportions.

### Fix

**File: `src/pages/SongDetail.tsx`**

1. **Line 215** -- Change the hero image container from `aspect-video` to `aspect-square`:
   - Replace `aspect-video` with `aspect-square` in the container's className
   - Remove the inline `style={{ aspectRatio: '1/1', objectFit: 'cover' }}` from the `<img>` tag (redundant once the container is square)

2. **Line 104** -- Update the loading skeleton to match:
   - Replace `aspect-video` with `aspect-square` in the Skeleton className

These two changes ensure the hero image container is 1:1, matching the 512x512 cropped artwork.

### What stays unchanged
- Upload logic, crop modal, storage mechanism
- All other components (SongCard, Cart, Browse, etc.)
- Image source logic (`artwork_cropped_url || cover_image_url`)
- Page layout structure

