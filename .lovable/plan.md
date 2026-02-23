

## Update Song Card Price Display to Use License Tiers

### Overview
Replace the current `basePrice` / "Starting from" display on homepage song cards with dynamic tier-based pricing. When exclusive tier exists, show only its price. When multiple non-exclusive tiers exist, show a price range. When a single tier exists, show just that price.

### Approach
The most efficient approach is to fetch license tiers alongside songs and pass computed price data to `SongCard`. This avoids per-card API calls.

---

### Change 1: `src/hooks/useSongs.ts`

**Modify `fetchSongsWithSellers` (and rename to a more general enrichment function):**
- After fetching seller profiles, also batch-fetch license tiers for all song IDs
- Attach `license_tiers` array to each song object

```typescript
// After fetching profiles, also fetch license tiers
const { data: tiers } = await supabase
  .from("license_tiers")
  .select("song_id, license_type, price")
  .in("song_id", songIds)
  .eq("is_available", true);

const tierMap = new Map<string, Array<{license_type: string; price: number}>>();
tiers?.forEach(t => {
  if (!tierMap.has(t.song_id)) tierMap.set(t.song_id, []);
  tierMap.get(t.song_id)!.push(t);
});

// Attach to each song
return songs.map(song => ({
  ...song,
  seller: ...,
  license_tiers: tierMap.get(song.id) || []
}));
```

**Modify `useFeaturedSongs`:** Already uses `fetchSongsWithSellers`, so it gets tiers automatically.

### Change 2: `src/hooks/useNewUploads.ts`

**Modify `useNewUploads`:** After fetching songs via RPC, batch-fetch their license tiers and attach to each song.

### Change 3: `src/components/songs/SongCard.tsx`

**Add new optional prop:**
```typescript
licenseTiers?: Array<{ license_type: string; price: number }>;
```

**Update price display section (lines 256-263):**
- Compute display price from `licenseTiers` prop (if provided):
  - If any tier has `license_type === 'exclusive'`: show only its price, no "Starting from" label
  - If multiple non-exclusive tiers: show range "min price - max price", no "Starting from" label  
  - If single tier: show its price, no "Starting from" label
  - Fallback to `basePrice` with "Starting from" if no tiers provided

```tsx
// Inside price section
{(() => {
  if (licenseTiers && licenseTiers.length > 0) {
    const exclusive = licenseTiers.find(t => t.license_type === 'exclusive');
    if (exclusive) {
      return <p className="text-base md:text-lg font-bold text-primary"><Price amount={exclusive.price} /></p>;
    }
    const prices = licenseTiers.map(t => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min !== max) {
      return <p className="text-base md:text-lg font-bold text-primary"><Price amount={min} /> – <Price amount={max} /></p>;
    }
    return <p className="text-base md:text-lg font-bold text-primary"><Price amount={min} /></p>;
  }
  return (
    <>
      <span className="text-[10px] md:text-xs text-muted-foreground">Starting from</span>
      <p className="text-base md:text-lg font-bold text-primary"><Price amount={basePrice} /></p>
    </>
  );
})()}
```

### Change 4: Pass `licenseTiers` in all homepage sections

Update the SongCard usage in:
- `src/components/home/FeaturedSongs.tsx` -- add `licenseTiers={song.license_tiers}`
- `src/components/home/LatestReleases.tsx` -- add `licenseTiers={song.license_tiers}`
- `src/components/home/NewUploads.tsx` -- add `licenseTiers={song.license_tiers}`

---

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSongs.ts` | Batch-fetch license tiers in `fetchSongsWithSellers` |
| `src/hooks/useNewUploads.ts` | Fetch license tiers after RPC call |
| `src/components/songs/SongCard.tsx` | Add `licenseTiers` prop, update price display logic |
| `src/components/home/FeaturedSongs.tsx` | Pass `licenseTiers` to SongCard |
| `src/components/home/LatestReleases.tsx` | Pass `licenseTiers` to SongCard |
| `src/components/home/NewUploads.tsx` | Pass `licenseTiers` to SongCard |

### What stays the same
- Card layout, styling, structure
- Backend schema and pricing logic
- Upload form logic
- Browse page (uses same hook, gets tiers automatically)
- SongDetail page pricing (unchanged)
- Price component (unchanged)

