

## Admin Instant Fund Release & Configurable Hold Period

### Problem
1. Admin can only release funds that are already 7+ days old (the "Release Cleared Funds" button). There's no way to instantly release a specific seller's pending funds before the 7-day hold.
2. The 7-day hold period is hardcoded in the `release_cleared_funds` DB function and `verify-payment` edge function. Admin cannot change it.

### Changes

#### 1. Add "Payment Hold Days" setting to Platform Settings page
- Add a new setting card in `src/pages/admin/PlatformSettings.tsx` for `payment_hold_days` (default: 7, min: 0, max: 30)
- Admin can change the global hold period from this page

#### 2. Update `release_cleared_funds` DB function
- New migration: alter the function to read `payment_hold_days` from `platform_settings` instead of hardcoded `'7 days'`

#### 3. Create `instant_release_seller_funds` DB function
- New migration: a function that takes `p_seller_id` and immediately moves ALL pending transactions for that seller to cleared, updating the wallet balances — bypassing the hold period

#### 4. Add per-seller "Instant Release" button in Withdrawal Management
- In `src/pages/admin/WithdrawalManagement.tsx`, add a dialog/button that lets admin select a seller and instantly release their held funds
- Add `useInstantReleaseFunds` hook in `src/hooks/useAdminData.ts` that calls the new DB function via RPC

#### 5. Update `get_pending_clearance_info` function
- Read `payment_hold_days` from `platform_settings` instead of hardcoded 7 days, so seller wallet page shows correct clearance dates

### Files to modify
- `src/pages/admin/PlatformSettings.tsx` — add hold days setting card
- `src/hooks/useAdminData.ts` — add `useInstantReleaseFunds` hook
- `src/pages/admin/WithdrawalManagement.tsx` — add instant release UI
- 1 DB migration — update `release_cleared_funds`, `get_pending_clearance_info`, and create `instant_release_seller_funds`

