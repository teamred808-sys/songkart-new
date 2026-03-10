

## Fix: "Verify Now" button failing with auth error

### Root Cause

The `send-verification-email` edge function has `verify_jwt = true` in `supabase/config.toml`. The Supabase gateway validates the JWT **before** the function code runs. The logs show repeated `"invalid claim: missing sub claim"` errors at the gateway level, meaning the token never reaches the function's own auth logic.

This is a known issue with Lovable Cloud deployments where `verify_jwt = true` can fail on valid user tokens.

### Fix

1. **`supabase/config.toml`** — Change `verify_jwt = false` for `send-verification-email`

2. **`supabase/functions/send-verification-email/index.ts`** — Add explicit token validation in code:
   - Extract the Bearer token from the Authorization header
   - Call `supabase.auth.getUser(token)` to validate explicitly
   - This replaces the gateway-level JWT check with in-code validation that works reliably on Lovable Cloud

3. **Redeploy** the edge function

### Changes are minimal
- config.toml: 1 line change
- index.ts: Update the user auth section (lines 39-56) to use explicit `getUser(token)` instead of relying on client header passthrough

