

## Add Pagination to Blog Page

### Overview
Add client-side pagination to the blog page, showing 10 posts per page with navigation controls at the bottom.

### File Changes

#### 1. `src/pages/Blog.tsx`
- Import `useState` from React
- Import pagination components from `@/components/ui/pagination`
- Add `currentPage` state (default: 1)
- Slice the `posts` array to show only 10 posts per page based on `currentPage`
- Calculate total pages from posts length
- Add pagination controls below the grid when there are more than 10 posts
- Reset to page 1 is not needed since all posts are fetched at once

The pagination UI will use the existing `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, and `PaginationEllipsis` components already in the project.

### Technical Details

```text
Posts Array (all fetched)
    |
    v
Slice: posts.slice((currentPage - 1) * 10, currentPage * 10)
    |
    v
Render 10 posts + Pagination controls
```

- Posts per page: 10
- Pagination shows: Previous, page numbers (with ellipsis for many pages), Next
- Previous disabled on page 1, Next disabled on last page
- Clicking a page number updates `currentPage` state and scrolls to top
- No changes to the data fetching hook -- all posts are still fetched in one query

### No other files changed

