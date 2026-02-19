

## Add Pagination to Content Management Section

### Overview
Add client-side pagination to both the Pages and Blog Posts tabs in the content management admin section, showing 10 items per page with navigation controls.

### File Changes

#### `src/pages/admin/ContentManagement.tsx`
- Import pagination components from `@/components/ui/pagination`
- Add `currentPage` state (default: 1), reset to 1 when switching between Pages/Posts tabs or when the search query changes
- Define `ITEMS_PER_PAGE = 10`
- Slice the active filtered list (`filteredPages` or `filteredPosts`) based on current page
- Add pagination controls below the content list (only shown when total items exceed 10)
- Reuse the same `getPageNumbers` helper pattern from the Blog page for ellipsis handling

### Technical Details

```text
filteredPages/filteredPosts (after search filter)
    |
    v
Slice: items.slice((currentPage - 1) * 10, currentPage * 10)
    |
    v
Render up to 10 cards + Pagination controls
```

- Items per page: 10
- `currentPage` resets to 1 when:
  - User switches between Pages and Posts tabs
  - User changes the search query
- Pagination shows Previous, page numbers (with ellipsis for large counts), Next
- Previous disabled on page 1, Next disabled on last page

### No other files changed

