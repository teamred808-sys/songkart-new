

## Fix: Allow Sellers to Enter ₹0 Price for Commercial License

### Problem
The price input uses `value={tier.price || ''}` which treats `0` as falsy, showing an empty field instead of displaying "0". This makes it impossible for the seller to confirm they've set a ₹0 price -- the field always appears blank.

### Changes

**File: `src/pages/seller/UploadSong.tsx`**

1. **Line 830** -- Fix the value binding to preserve `0`:
   - Change `value={tier.price || ''}` to `value={tier.price === 0 ? '0' : (tier.price || '')}`
   - This ensures that when the price is exactly `0`, the input displays "0" instead of appearing empty

That is the only change needed. The Zod schema already allows `price >= 0` for commercial, and the submission logic already sets `is_free` correctly when a commercial tier has price `0`.

