

## Email Verification System — Already Exists, Needs Bug Fixes

Your project **already has a complete email verification system** with all the components you described. Here's what exists:

- **Database**: `seller_verification_tokens` table with `user_id`, `token`, `expires_at`, `used_at`
- **Profiles**: `is_verified` boolean field on `profiles` table
- **Send email**: `send-verification-email` edge function (Resend, rate-limited, token generation)
- **Verify token**: `verify-seller-email` edge function (validates token, marks profile verified)
- **Frontend page**: `src/pages/VerifyEmail.tsx` at `/verify-email`
- **Banner**: `VerificationWarningBanner` component shown to unverified sellers
- **Auth context**: `is_verified` tracked in profile, `refreshProfile` available

### Bugs to Fix

**1. Variable name collision in `send-verification-email/index.ts`**
Line 39 declares `const token` (auth JWT), and line 109 declares `const token` (verification UUID). This causes a runtime error. Fix: rename line 109 to `const verificationToken`.

**2. Token expiry is 1 hour, user wants 24 hours**
Line 110: change from `60 * 60 * 1000` to `24 * 60 * 60 * 1000`.

**3. Verification link URL uses Lovable preview URL**
Line 134: hardcoded fallback is `https://vxegvnndkeoubqnruiqj.lovableproject.com`. Change to `https://songkart.lovable.app` (or better, `https://songkart.com` if that's the production domain).

**4. All references to `token` after line 109 need updating to `verificationToken`**
Lines 119, 135, 181 in the same file.

### Changes

| File | Change |
|---|---|
| `supabase/functions/send-verification-email/index.ts` | Fix variable collision (`token` → `verificationToken`), update expiry to 24h, update fallback URL |

No database changes needed. No new edge functions needed. No frontend changes needed. Everything else is already implemented correctly.

