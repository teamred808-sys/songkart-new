

## Fix Branding: Replace "SongMarket" with "SongKart" in License Template

### Problem
The license agreement HTML template in the `generate-license-pdf` edge function uses "SongMarket" in multiple places instead of the correct brand name "SongKart".

### Changes

**File: `supabase/functions/generate-license-pdf/index.ts`**

Replace all 4 occurrences of "SongMarket" with "SongKart":

| Line | Current | Updated |
|------|---------|---------|
| 238 | `SONGMARKET` | `SONGKART` |
| 350 | `SongMarket` | `SongKart` |
| 352 | `support@songmarket.com` | `support@songkart.com` |
| 356 | `SongMarket License Agreement` | `SongKart License Agreement` |

After editing, the edge function will be redeployed. Existing licenses are unaffected; only newly generated or regenerated licenses will reflect the updated branding.

