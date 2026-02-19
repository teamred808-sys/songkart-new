

## Restore Original Layout with Two Sections (No "All Content")

### Problem
The restructured Content Management page introduced new visual elements (section headings with icons, different spacing patterns) that deviate from the original design. The layout needs to return to the exact original visual appearance while keeping Pages and Blog Posts as separate sections.

### What Changed (and Shouldn't Have)
- Added prominent `h2` section headings with icons (`FileText`, `Newspaper`) that didn't exist in the original
- Section wrapper `div`s with `space-y-3` introduced extra vertical grouping not present before
- The original had a flat list of content cards under a single `space-y-4` container (inside TabsContent)

### Fix
Restore the original flat card list layout. Use simple, minimal text labels (not headings with icons) to separate the two groups, keeping the same card component, spacing, and container structure the original tabs content used.

### File: `src/pages/admin/ContentManagement.tsx`

**Changes:**
1. Replace the two `div.space-y-3` section wrappers (with `h2` headings and icons) with a single `space-y-4` container matching the original TabsContent layout
2. Use lightweight `p` or small text labels ("Pages" / "Blog Posts") as subtle dividers instead of large headings with icons
3. Remove the `FileText` and `Newspaper` icon imports for section headers (keep them for card rendering and buttons)
4. Content cards render in the same `space-y-4` list, pages first then posts, separated by a subtle label
5. Keep the same `renderContentCard` function unchanged
6. Keep header, search bar, buttons, and delete dialog completely untouched

**Structure (matches original):**
```
<div className="space-y-6">              {/* same outer wrapper */}
  [Header + buttons — unchanged]
  [Search bar — unchanged]

  <div className="space-y-4">            {/* same as original content area */}
    <h3 className="text-lg font-semibold">Pages</h3>
    [page cards or empty state]

    <h3 className="text-lg font-semibold mt-2">Blog Posts</h3>
    [post cards or empty state]
  </div>

  [Delete dialog — unchanged]
</div>
```

### No Other Files Modified
Only `src/pages/admin/ContentManagement.tsx` is touched. No layout containers, parent components, grid systems, or global styles are changed.

### Technical Details

- The original content area inside `TabsContent` used `space-y-4` for card spacing — this is restored
- Section labels use `text-lg font-semibold` matching other admin page sub-section styles
- No new wrapper divs or layout containers are introduced
- Card component (`renderContentCard`) remains identical
- Loading skeletons and empty states remain identical
- The `h-5 w-5` icon + `text-xl font-semibold` section headers are removed in favor of simpler labels

