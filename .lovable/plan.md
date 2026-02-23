

## Allow ₹0 Commercial License with Free Songs Section

### Summary
Allow sellers to set ₹0 price for Commercial licenses (but not Exclusive), add an `is_free` column to songs, create a "Free Downloads" homepage section, show "Free" label on song cards instead of "₹0", and route ₹0 commercial items through the free checkout flow.

### Database Changes

**Migration: Add `is_free` column to `songs` table**
- Add `is_free boolean NOT NULL DEFAULT false` to `songs`
- This will be set automatically when a commercial license tier has price = 0

### Frontend Changes

**1. `src/pages/seller/UploadSong.tsx` -- Pricing validation**
- Change `licenseTierSchema` to allow price = 0 for commercial but enforce min 1 for exclusive:
  - Remove global `.min(0.01)` from price
  - Add a `.superRefine()` on the schema to validate: if `license_type === 'exclusive'`, price must be >= 1
- In the price input `onChange` handler (line 828-832): clamp exclusive price to min 1 if value is 0
- When submitting (line 348): after inserting license tiers, check if any commercial tier has price 0 and set `is_free = true` on the song

**2. `src/pages/seller/EditSong.tsx` -- Price update validation**
- In `handleUpdateTierPrice` (line 205-223): if the tier is exclusive, enforce minimum price of 1
- After saving tier price, update song's `is_free` field based on whether any commercial tier has price 0

**3. `src/components/ui/Price.tsx` -- Display "Free" for ₹0**
- Add logic: if `amount === 0`, render "Free" in green text instead of "₹0"

**4. `src/components/songs/SongCard.tsx` -- Free badge on card**
- In the price section (lines 258-296): when the minimum price across license tiers is 0, show a green "Free" badge instead of the price

**5. New component: `src/components/home/FreeSongs.tsx`**
- Create a "Free Downloads" homepage section
- Query songs where `is_free = true` and `status = 'approved'`
- Display using the same SongCard grid pattern as FeaturedSongs/NewUploads

**6. `src/pages/Index.tsx` -- Add FreeSongs section**
- Import and render `<FreeSongs />` component on the homepage (after FeaturedSongs)

**7. `src/pages/SongDetail.tsx` -- License option display**
- When displaying license tier price, the `<Price>` component will automatically show "Free" for ₹0 tiers

### Checkout Flow (already handled)

The existing checkout flow already supports ₹0 transactions:
- `Cart.tsx` already detects `finalPayable === 0` and routes to `freeCheckout`
- `useFreeCheckout.ts` already calls the `free-checkout` edge function
- `free-checkout/index.ts` already validates `price === 0`, creates orders, generates license PDFs, and grants download access
- No changes needed to checkout or edge functions

### Technical Details

**Zod schema change (UploadSong.tsx):**
```typescript
const licenseTierSchema = z.object({
  license_type: z.enum(['commercial', 'exclusive']),
  price: z.number().min(0, 'Price cannot be negative'),
  max_sales: z.number().optional(),
  terms: z.string().optional(),
}).refine(
  (data) => data.license_type !== 'exclusive' || data.price >= 1,
  { message: 'Exclusive license price must be at least ₹1', path: ['price'] }
);
```

**Price component change:**
```typescript
if (amount === 0) {
  return <span className={cn("text-green-500 font-semibold", className)}>Free</span>;
}
```

**Upload submit -- set is_free:**
After inserting license tiers, check if any commercial tier has price = 0 and update the song record with `is_free: true`.

**Edit song -- keep is_free in sync:**
After updating a tier price, re-check all tiers for the song and update `is_free` accordingly.

