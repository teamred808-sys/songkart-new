

## Fix: Show All License Types Per Song in License Vault

### Problem
Line 107-109 in `src/pages/buyer/MyDownloads.tsx` deduplicates items by `song.id` alone:
```typescript
const uniqueItems = downloadableItems.filter((item, index, self) =>
  index === self.findIndex(t => t.song?.id === item.song?.id)
);
```
This means if a user purchases both a "personal" and "commercial" license for the same song, only the first one appears.

### Fix
Change the dedup key to a composite of `song.id` + `license_type`, so each unique license per song is shown:

**File: `src/pages/buyer/MyDownloads.tsx` (lines 107-109)**

Replace:
```typescript
const uniqueItems = downloadableItems.filter((item, index, self) =>
  index === self.findIndex(t => t.song?.id === item.song?.id)
);
```
With:
```typescript
const uniqueItems = downloadableItems.filter((item, index, self) =>
  index === self.findIndex(t => t.song?.id === item.song?.id && t.license_type === item.license_type)
);
```

This is a one-line change. No other files need modification. The stats counters and card rendering already work per-item, so they will correctly reflect the additional entries.
