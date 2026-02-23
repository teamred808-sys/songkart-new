
## Dynamic Seller Tier Pricing Limits in Song Upload

### Summary
Replace the hardcoded pricing caps (Personal: 500, Commercial: 3000) in the Upload Song pricing section with dynamic values from the seller's tier (`max_price_lyrics_only` and `max_price_with_audio`), fetched via the existing `useSellerTier` hook.

### Changes

**File: `src/pages/seller/UploadSong.tsx`**

1. **Import `useSellerTier`** hook at the top of the file.

2. **Call the hook** inside the `UploadSong` component:
   ```typescript
   const { data: sellerTier } = useSellerTier();
   ```

3. **Replace hardcoded limits** (lines 795-800) with dynamic values:
   - `max` attribute on Personal input: `sellerTier?.max_price_lyrics_only ?? undefined`
   - `max` attribute on Commercial input: `sellerTier?.max_price_with_audio ?? undefined`
   - Clamping logic for Personal: clamp to `sellerTier?.max_price_lyrics_only`
   - Clamping logic for Commercial: clamp to `sellerTier?.max_price_with_audio`
   - Exclusive: no restriction (unchanged)

No other files, UI layout, tier selection logic, or form structure will be modified.
