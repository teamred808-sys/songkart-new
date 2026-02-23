
## Filter Browse Page by Free Songs

### Summary
When the user clicks the "Free" link in the navbar (`/browse?free=true`), the Browse page should only display songs where `is_free = true`. Currently, the `free` query parameter is ignored.

### Changes

**1. `src/components/songs/SongFilters.tsx`**
- Add `isFree?: boolean` to the `SongFiltersState` interface (optional, so existing usage is unaffected)

**2. `src/pages/Browse.tsx`**
- Read the `free` query parameter from the URL (`searchParams.get("free")`)
- When `free=true`, set `isFree: true` in the initial filters
- Update the page header to show "Free Music" title, a green "Free Downloads" badge, and adjusted description when in free mode
- Hide the "Prices from ₹29" chip in free mode

**3. `src/hooks/useSongs.ts`**
- In the `useSongs` function, when `filters.isFree` is `true`, add `.eq("is_free", true)` to the query so only free songs are returned from the database

### Technical Details

**Browse.tsx -- read param and set filter:**
```typescript
const freeParam = searchParams.get("free");

const initialFilters = useMemo(() => ({
  ...existingDefaults,
  isFree: freeParam === "true",
}), [freeParam]);
```

**useSongs.ts -- apply filter:**
```typescript
if (filters.isFree) {
  query = query.eq("is_free", true);
}
```

**Browse.tsx -- conditional header:**
Show "Free Music" title and green badge when in free mode; otherwise show the existing "Browse Music" header.
