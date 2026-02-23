

## Remove "Lyrics Only" Pricing and Make Audio Compulsory

### Summary
Audio (composition) upload is already required in the upload flow. This change removes the "Lyrics Only" pricing category from the seller-facing UI and always applies "With Audio" pricing limits.

### Changes

**1. `src/components/seller/SellerTierCard.tsx` (lines 112-129)**
- Remove the "Lyrics Only" column from the Pricing Limits grid
- Show only "Max Price" using `max_price_with_audio` value
- Change from 2-column grid to a single display

**2. `src/components/seller/PricingLimitBanner.tsx` (lines 7-11, 24-26, 76)**
- Remove `hasAudio` prop entirely
- Always use `tierInfo.max_price_with_audio` for `maxAllowed`
- Update label from "Max with audio price" to just "Max price"

**3. `src/pages/seller/UploadSong.tsx`**
- Update any references passing `hasAudio` to `PricingLimitBanner` (if any)
- The upload form already requires audio (`Full Audio File *` is mandatory in step 2 validation at line 409)

**4. `src/pages/seller/EditSong.tsx`**
- Update any references passing `hasAudio` to `PricingLimitBanner` (if any)

### What stays unchanged
- Database schema (columns remain, no migration needed)
- Upload validation (audio is already required)
- Backend tier RPC functions
- `useSellerTier` hook interface
