

## Fix License PDF Loading and Add Regeneration Feature

### Root Cause
The license document is generated and stored as an **HTML file** (`.html` extension), but the download hook saves it with a `.pdf` extension. When the browser or OS tries to open the downloaded file as a PDF, it fails with "Failed to load PDF document."

### Part 1: Fix License Download

**File: `src/hooks/useLicenses.ts`**

Change the download filename from `.pdf` to `.html` on line 94:
```typescript
link.download = data.filename || `license_${data.license_number || 'agreement'}.html`;
```

Add `try-catch` with retry logic around the fetch in `onSuccess`. If fetching the signed URL fails after 3 retries with exponential backoff, surface a clear error message instead of crashing.

### Part 2: Add Regenerate License Feature

**File: `src/hooks/useLicenses.ts`**

Add a new `useRegenerateLicense` mutation hook:
- Calls the existing `generate-license-pdf` edge function with the `order_item_id`
- The edge function already handles regeneration (it creates a new license doc and updates the order item)
- Need to modify the edge function to use `upsert: true` for storage upload so it can overwrite the existing file
- After successful regeneration, invalidate the `license-documents` query cache
- Include a cooldown state (10 seconds) to prevent rapid regenerations

**File: `supabase/functions/generate-license-pdf/index.ts`**

Line 480: Change `upsert: false` to `upsert: true` to allow re-uploading the license file when regenerating.

Also handle the case where a `license_documents` record already exists for the same `order_item_id` -- use upsert or delete-then-insert.

**File: `src/pages/buyer/MyDownloads.tsx`**

Update the License download button section (around lines 388-413):
- Import and use the new `useRegenerateLicense` hook
- Add loading state while fetching the license URL
- On download failure, show an inline error message with a "Regenerate License" button
- Add a standalone "Regenerate License" icon button next to the existing download button
- Only enable regeneration for completed orders (already guaranteed by being in this view)

**File: `src/pages/buyer/MyPurchases.tsx`**

Update the License download button section (around lines 284-298):
- Add similar "Regenerate License" button alongside the existing License download button
- Show error state with regeneration option on failure

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useLicenses.ts` | Fix `.pdf` to `.html` extension; add retry logic; add `useRegenerateLicense` hook |
| `supabase/functions/generate-license-pdf/index.ts` | Change storage upload to `upsert: true`; handle existing license_documents record |
| `src/pages/buyer/MyDownloads.tsx` | Add regenerate button; show error state with regeneration option |
| `src/pages/buyer/MyPurchases.tsx` | Add regenerate button alongside license download |

### What stays the same
- License HTML template/layout
- Purchase flow and payment integration
- Edge function `download-license` logic
- Order structure and data model

