

## Update Promo Discount to Apply on Full Total (Song Price + Platform Fee)

### Overview
Change the promo discount calculation so it applies on the combined total (Song Price + Platform Fee) instead of only the Song Price. No UI layout, payment gateway, or validation logic changes.

### Current Behavior
- Cart sends `license_price` (song price only) to the validate-promo-code edge function
- Edge function calculates discount based on song price alone
- Example: Song ₹500 + Fee ₹75 = ₹575, but 20% promo gives -₹100 (20% of ₹500) → Total ₹475

### New Behavior
- Cart sends `buyer_total` (song price + platform fee) to the validate-promo-code edge function
- Edge function calculates discount on the full buyer total
- Example: Song ₹500 + Fee ₹75 = ₹575, 20% promo gives -₹115 (20% of ₹575) → Total ₹460

---

### Change 1: `src/pages/buyer/Cart.tsx` (line 64-68)

Update `cartItemsForValidation` to include the buyer's full payable amount per item instead of just the song price:

```typescript
const cartItemsForValidation = cart.items.map(item => ({
  song_id: item.song_id,
  license_type: item.license_tiers?.license_type || 'personal',
  license_price: item.buyerTotalPaid || (item.songPrice + item.platformFeeBuyer) || 0,
}));
```

This passes the combined (song price + buyer platform fee) as the base for discount calculation.

### Change 2: `supabase/functions/validate-promo-code/index.ts` (lines 132-141)

No structural changes needed. The edge function already calculates discount based on `item.license_price`. Since we now pass the full buyer total as `license_price`, the percentage/flat discount will automatically apply on the correct base amount.

However, update the `min_purchase_amount` check (line 133) comment for clarity -- the logic itself remains correct since it now compares against the full buyer amount.

---

### Files Changed

| File | Change |
|------|--------|
| `src/pages/buyer/Cart.tsx` | Pass `buyerTotalPaid` (song + fee) as `license_price` in promo validation request |

### What stays the same
- PriceBreakdown UI layout and structure
- Payment gateway (Cashfree) integration
- Promo validation logic in edge function
- Checkout button behavior
- Cart schema
- `finalTotal = Math.max(0, total - discount)` clamping in PriceBreakdown

