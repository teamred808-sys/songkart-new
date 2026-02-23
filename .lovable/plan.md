

## Remove Personal Use License Tier from SongKart

### Summary
Deprecate the Personal Use license tier across the platform while preserving all existing order data. New uploads and purchases will only support Commercial and Exclusive licenses.

### Database Change

**Migration: Deactivate Personal tier in `license_tier_definitions`**
- Set `is_active = false` for the Personal tier (`tier_key = 'personal'`) in `license_tier_definitions`
- This automatically hides it from the `LicenseComparisonTable` component (which filters by `is_active = true`)
- Existing `license_tiers` rows with `license_type = 'personal'` remain untouched for past orders

### Frontend Changes

**1. `src/lib/constants.ts`**
- Remove `personal` entry from `LICENSE_INFO` and `LICENSE_TYPES` objects

**2. `src/pages/seller/UploadSong.tsx`**
- Remove `personal` from `LICENSE_TYPES` array (line 24)
- Remove `personal` from `licenseTierSchema` enum (line 47)
- Clean up exclusivity logic in `addLicenseTier` -- no longer needs to filter personal
- Clean up `hasNonExclusive` check (line 730) -- only checks for commercial

**3. `src/pages/seller/EditSong.tsx`**
- Remove `personal` entry from local `LICENSE_TYPES` array (line 35)
- Remove `personal` references in exclusivity conflict logic (lines 186-188, 242-246)

**4. `src/pages/LicensesPage.tsx`**
- Remove `personal` entry from `licenseData` object (lines 33-58)
- Update SEO title/description to mention only Commercial and Exclusive
- Update the guidance text at the bottom (line 327) to remove Personal reference

**5. `src/pages/seller/PromoCodes.tsx`**
- Remove `<SelectItem value="personal">Personal Use</SelectItem>` from license tier dropdown (line 138)

**6. `src/pages/admin/PromoManagement.tsx`**
- Remove `<SelectItem value="personal">Personal Use</SelectItem>` from license tier dropdown (line 94)

**7. `src/components/seo/InternalLinks.tsx`**
- Remove `personal` from the `licenseType` union type and labels map

**8. `src/components/seo/SongSEOHead.tsx`**
- Update SEO description text to remove "Personal Use" mention (line 137)

**9. `supabase/functions/sitemap/index.ts`**
- Remove the `/licenses/personal` sitemap entries (lines 154-158, 410-414)

**10. `src/hooks/useSellerData.ts`**
- Remove `'personal'` from `license_type` union types (lines 40, 441)

**11. `src/pages/buyer/BuyerDashboard.tsx`**
- Change fallback license type from `'personal'` to `'commercial'` (line 161)

### What stays unchanged
- Database tables: `license_tiers`, `order_items`, `transactions` -- no schema changes
- Checkout flow layout, payment gateway, order history structure
- `LicenseComparisonTable` component -- automatically excludes Personal via `is_active = false` in DB
- `CartItemCard` -- displays whatever `license_type` string is stored (works for legacy personal orders)
- `generate-license-pdf` edge function -- already has no personal-specific logic
- All existing orders and license documents remain accessible and downloadable
