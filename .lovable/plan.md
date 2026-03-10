

## Fix: Verification page showing generic error instead of specific message

### Root Cause

When `supabase.functions.invoke()` receives a non-2xx response, it sets `error` with a generic message ("Edge Function returned a non-2xx status code") BUT still populates `data` with the actual response body. The current code in `VerifyEmail.tsx` checks `if (error)` first and returns early, never reaching the `data?.error` check that has the real message like "This verification link has already been used".

From the logs: the token **was already used** — the function correctly returns `{ error: "This verification link has already been used", already_used: true }` with status 400, but the frontend never reads it.

### Fix in `src/pages/VerifyEmail.tsx`

Change the error handling block (lines 31-36) to extract the message from `data` first when available, falling back to the generic `error.message`:

```typescript
if (error) {
  console.error("Verification error:", error);
  setStatus("error");
  // data may still contain the specific error message from the function
  setMessage(data?.error || error.message || "Failed to verify email. Please try again.");
  return;
}
```

This single change ensures users see "This verification link has already been used" or "This verification link has expired" instead of the generic "Edge Function returned a non-2xx status code".

### Files Changed
| File | Change |
|---|---|
| `src/pages/VerifyEmail.tsx` | Use `data?.error` over `error.message` for specific error messages |

