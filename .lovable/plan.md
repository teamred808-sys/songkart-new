

## Make Price Field Start Empty on License Tier Selection

### Problem
When a seller selects a license tier (e.g., Commercial), the price is initialized to `0`, which pre-fills the input with "0". The seller should see an empty field with the "Enter price" placeholder instead, and set the price themselves.

### Changes

**File: `src/pages/seller/UploadSong.tsx`**

1. **Line 258** -- Change the initial price from `0` to `undefined`/empty:
   - Change `{ license_type: type, price: 0, terms: '' }` to `{ license_type: type, price: undefined, terms: '' }`

2. **Line 830** -- Simplify the value binding back:
   - Change `value={tier.price === 0 ? '0' : (tier.price || '')}` to `value={tier.price ?? ''}`
   - This displays empty when price is `undefined`/`null`, and shows `0` if the seller explicitly types `0`

This way the field starts blank with the "Enter price" placeholder, and sellers can type `0` for free songs or any other price.

