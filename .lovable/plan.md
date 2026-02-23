

## Promo Code System -- Full Integration Plan

### Overview
Build a complete promo code system with a new `promo_codes` database table, a validation edge function, seller/admin management UIs, and checkout integration. Admin promos take priority over seller promos; only one code applies per checkout.

---

### Part 1: Database Migration

Create a `promo_codes` table:

```sql
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  created_by uuid NOT NULL,
  creator_role text NOT NULL CHECK (creator_role IN ('admin', 'seller')),
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE,
  license_type text,  -- 'personal', 'commercial', 'exclusive', or NULL for all
  min_purchase_amount numeric DEFAULT 0,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(code)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
```

**RLS Policies:**
- Admins can manage all promo codes (ALL)
- Sellers can manage their own promo codes (INSERT/UPDATE/SELECT where `created_by = auth.uid()` and `creator_role = 'seller'`)
- Authenticated users can SELECT active, non-expired promo codes (for validation at checkout)

Also create a `promo_code_usages` table to track per-user usage:

```sql
CREATE TABLE public.promo_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid,
  discount_amount numeric NOT NULL,
  used_at timestamptz DEFAULT now()
);

ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;
```

**RLS:** Admins can manage all; users can SELECT their own usages; system (admin role) can INSERT.

---

### Part 2: Promo Code Validation Edge Function

Create `supabase/functions/validate-promo-code/index.ts`:

**Input:** `{ code, song_id, license_type, license_price }`

**Logic:**
1. Look up the code in `promo_codes` where `is_active = true`, not expired, and usage not exceeded
2. Check admin codes first (`creator_role = 'admin'`), then seller codes
3. Validate song_id match (if promo is song-specific)
4. Validate license_type match (if promo is tier-specific)
5. Validate min_purchase_amount (if set)
6. Calculate discount amount (cap percentage at 100%, cap flat at license price)
7. Return `{ valid, discount_amount, promo_code_id, discount_type, discount_value, message }`

---

### Part 3: Checkout Page -- Promo Code Input

**File: `src/pages/buyer/Cart.tsx`**

Add a promo code input section in the Order Summary card (desktop) and mobile bar:
- Text input + "Apply" button
- State: `promoCode`, `appliedPromo` (result from validation), `promoError`
- On "Apply": call the `validate-promo-code` edge function for each cart item's song/tier, pick the best valid match
- Show green badge with discount amount when valid
- Show "Remove" button to clear applied promo
- Only one promo code at a time

**File: `src/components/cart/PriceBreakdown.tsx`**

Add optional `discount` prop:
```typescript
interface PriceBreakdownProps {
  subtotal: number;
  platformFee: number;
  total: number;
  itemCount: number;
  discount?: number;       // new
  promoCode?: string;      // new
}
```

Show discount line between subtotal and separator when `discount > 0`:
```
Promo Discount (CODE)     -₹XXX
```

Adjust total display to reflect `total - discount`.

---

### Part 4: Pass Promo to Checkout Session

**File: `src/hooks/useCheckout.ts`**

Update `useCreateCheckoutSession` mutation to accept and pass `promo_code_id` and `discount_amount` in the body.

**File: `supabase/functions/create-checkout-session/index.ts`**

- Accept optional `promo_code_id` and `discount_amount` from request body
- Re-validate the promo code server-side (security check)
- Subtract discount from `totalAmount` before creating Cashfree order
- Store `promo_code_id` and `discount_amount` in `checkout_sessions` record
- After successful payment, increment `usage_count` on the promo code and insert into `promo_code_usages`

This requires adding two columns to `checkout_sessions`:
```sql
ALTER TABLE checkout_sessions ADD COLUMN promo_code_id uuid REFERENCES promo_codes(id);
ALTER TABLE checkout_sessions ADD COLUMN promo_discount numeric DEFAULT 0;
```

---

### Part 5: Seller Promo Management Page

**New file: `src/pages/seller/PromoCodes.tsx`**

A simple CRUD page within the seller layout:
- List seller's promo codes with status, usage stats
- Create new promo: code name, discount type/value, song selector, tier selector, usage limit, expiry
- Toggle active/inactive
- Song selector limited to seller's own approved songs

**Route:** Add `/seller/promo-codes` in `App.tsx` under seller routes.

**Sidebar:** Add "Promo Codes" link in `src/components/seller/SellerSidebar.tsx`.

---

### Part 6: Admin Promo Management Page

**New file: `src/pages/admin/PromoManagement.tsx`**

Admin CRUD page:
- List all promo codes (admin + seller created)
- Create global or song/tier-specific promos
- Set min purchase amount, usage limit, expiry
- View usage stats
- Deactivate codes

**Route:** Add `/admin/promo-codes` in `App.tsx` under admin routes.

**Sidebar:** Add "Promo Codes" link in `src/components/admin/AdminSidebar.tsx`.

---

### Part 7: Hook for Promo Code Operations

**New file: `src/hooks/usePromoCodes.ts`**

- `usePromoCodes()` -- fetch seller's or admin's promo codes
- `useCreatePromoCode()` -- mutation to insert
- `useUpdatePromoCode()` -- mutation to update
- `useValidatePromoCode()` -- calls edge function

---

### Files Changed Summary

| File | Change |
|------|--------|
| Migration SQL | Create `promo_codes` and `promo_code_usages` tables with RLS |
| Migration SQL | Add `promo_code_id`, `promo_discount` columns to `checkout_sessions` |
| `supabase/functions/validate-promo-code/index.ts` | New edge function |
| `supabase/functions/create-checkout-session/index.ts` | Accept and validate promo, adjust total |
| `src/hooks/usePromoCodes.ts` | New hook file |
| `src/hooks/useCheckout.ts` | Pass promo data to checkout |
| `src/pages/buyer/Cart.tsx` | Add promo code input UI |
| `src/components/cart/PriceBreakdown.tsx` | Add discount line |
| `src/pages/seller/PromoCodes.tsx` | New seller promo management page |
| `src/pages/admin/PromoManagement.tsx` | New admin promo management page |
| `src/App.tsx` | Add routes for promo pages |
| `src/components/seller/SellerSidebar.tsx` | Add promo codes nav link |
| `src/components/admin/AdminSidebar.tsx` | Add promo codes nav link |

### What stays the same
- Cart schema (`cart_items` table)
- Payment gateway integration (Cashfree SDK)
- Checkout UI layout (only adds input field)
- Song upload/edit flow
- Existing pricing calculation (promo discount applied on top)
- Purchase flow and order confirmation

