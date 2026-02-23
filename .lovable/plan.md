

## Restructure Promo Code UI in Order Summary

### Overview
Move the promo code interaction from above the price breakdown to inside the `PriceBreakdown` component, positioned below Platform Service Fee. Replace the always-visible input with a collapsed "Have a Discount Code? + Add" row that expands inline.

---

### Change 1: `src/pages/buyer/Cart.tsx`

**Remove the promo code UI block from the desktop Order Summary (lines 216-249).**

Instead, pass the promo interaction state/handlers down to `PriceBreakdown`:

```tsx
<PriceBreakdown
  subtotal={cart?.subtotal || 0}
  platformFee={cart?.buyerPlatformFee || 0}
  total={cart?.total || 0}
  itemCount={cart?.itemCount || 0}
  discount={appliedPromo?.discount_amount}
  promoCode={appliedPromo?.code}
  promoInput={promoInput}
  onPromoInputChange={setPromoInput}
  onApplyPromo={handleApplyPromo}
  onRemovePromo={handleRemovePromo}
  promoError={promoError}
  isValidating={validatePromo.isPending}
/>
```

Remove the `<div className="space-y-2">` block containing the promo input/applied badge (lines 217-249) from Cart.tsx entirely.

---

### Change 2: `src/components/cart/PriceBreakdown.tsx`

**Extend props** to accept promo interaction state:

```typescript
interface PriceBreakdownProps {
  subtotal: number;
  platformFee: number;
  total: number;
  itemCount: number;
  discount?: number;
  promoCode?: string;
  // New props for inline promo UI
  promoInput?: string;
  onPromoInputChange?: (val: string) => void;
  onApplyPromo?: () => void;
  onRemovePromo?: () => void;
  promoError?: string;
  isValidating?: boolean;
}
```

**Add local state** for expand/collapse:

```typescript
const [promoExpanded, setPromoExpanded] = useState(false);
```

**Restructure the render order** to:

1. Song Price row (unchanged)
2. Platform Service Fee row (unchanged)
3. **New: Promo Code section** (below Platform Fee, above Separator):
   - If promo is applied (`discount > 0 && promoCode`): show applied badge with discount amount and remove button
   - Else if collapsed: show `"Have a Discount Code?"` text + `"+ Add"` button
   - Else if expanded: show inline Input + Apply button
   - Show promoError if any
4. Separator (unchanged)
5. Total row showing `finalTotal` (unchanged)
6. Trust message (unchanged)

The collapsed row:
```tsx
<div className="flex items-center justify-between text-sm">
  <span className="text-muted-foreground">Have a Discount Code?</span>
  <Button variant="ghost" size="sm" onClick={() => setPromoExpanded(true)}>
    + Add
  </Button>
</div>
```

The expanded row:
```tsx
<div className="flex gap-2">
  <Input
    placeholder="Enter code"
    value={promoInput}
    onChange={e => onPromoInputChange?.(e.target.value.toUpperCase())}
    className="font-mono h-8 text-sm"
    maxLength={20}
  />
  <Button variant="outline" size="sm" onClick={onApplyPromo} disabled={!promoInput?.trim() || isValidating}>
    {isValidating ? '...' : 'Apply'}
  </Button>
</div>
```

The applied state:
```tsx
<div className="flex items-center justify-between text-sm text-green-600">
  <span className="flex items-center gap-1">
    <Tag className="h-3 w-3" />
    Promo Applied ({promoCode})
  </span>
  <div className="flex items-center gap-2">
    <span>-<Price amount={discount} /></span>
    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onRemovePromo}>
      <X className="h-3 w-3" />
    </Button>
  </div>
</div>
```

When promo is removed, collapse back to default state.

---

### Files Changed

| File | Change |
|------|--------|
| `src/pages/buyer/Cart.tsx` | Remove promo input block from desktop Order Summary; pass promo state as props to PriceBreakdown |
| `src/components/cart/PriceBreakdown.tsx` | Add collapsed/expanded promo code UI below Platform Fee row; accept new interaction props |

### What stays the same
- Pricing logic and total calculation
- Payment gateway integration (Cashfree)
- Checkout button behavior
- Mobile action bar
- Card styling and spacing system
- All promo validation logic (edge function calls)
- Cart structure

