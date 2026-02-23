

## Remove Audio/Lyrics Filter Buttons

### Summary
Remove the "Audio Only" / "Lyrics Only" quick filter chips from the Browse page and the "Audio" / "Lyrics" checkboxes from the SongFilters component (both desktop and mobile). Since audio is now compulsory, these filters are no longer relevant.

### Changes

**1. `src/pages/Browse.tsx`**
- Remove the `quickFilters` array (lines 14-17)
- Remove the `toggleQuickFilter` function (lines 62-64)
- Remove the quick filter chips rendering block (lines 95-108)
- Remove `hasAudio`/`hasLyrics` from `initialFilters` and the `useEffect` that sets them from URL params (lines 33-34, 42-46)
- Simplify `pageTitle` and `PageIcon` to always show "Browse Music" (remove audio/lyrics variants, lines 50-56)
- Update breadcrumb to always say "Browse Songs" (line 76)
- Update badge to always say "Licensed Content" (line 87)
- Remove unused imports (`FileText`, `Headphones`)

**2. `src/components/songs/SongFilters.tsx`**
- Remove `hasAudio` and `hasLyrics` from `SongFiltersState` interface (lines 44-45)
- Remove them from `clearFilters` reset (lines 101-102)
- Remove from `activeFiltersCount` calculation (lines 111-112)
- Remove desktop Audio/Lyrics checkboxes (lines 234-250)
- Remove mobile "Content Type" section (lines 357-376)

**3. `src/components/layout/Footer.tsx`**
- Remove the "Lyrics Only" link (`/browse?type=lyrics`) from the footer Resources section

