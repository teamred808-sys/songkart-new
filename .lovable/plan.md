

## Blog Category Feature Audit and Fixes

### Audit Findings

**TASK 1 -- Category Implementation Status**
- `cms_categories` table exists with `id`, `name`, `slug`, `created_at` -- correct
- `cms_content_categories` junction table exists with `content_id` and `category_id` foreign keys with ON DELETE CASCADE -- correct
- RLS policies are properly configured (public read, admin write)
- The relationship is Many-to-Many (one post can have multiple categories, one category can link to many posts) -- this is fine and more flexible than strict one-to-many
- Hooks in `useCmsCategories.ts` properly handle CRUD operations
- ContentEditor correctly loads, displays, and saves categories for posts
- **No schema changes needed**

**TASK 2 -- Category Display on Blog Posts List (ISSUE FOUND)**
- `ContentManagement.tsx` does NOT display categories on blog post cards
- The `useContentList` hook does not fetch category data alongside posts
- **Fix needed**: Fetch categories for each post and display them as badges on post cards

**TASK 3 -- Delete Category Feature (MISSING)**
- No delete category functionality exists anywhere
- `useCmsCategories.ts` has no delete hook
- No UI for deleting categories
- **Fix needed**: Add a delete hook and deletion UI with confirmation modal

---

### Changes Required

#### 1. `src/hooks/useCmsCategories.ts` -- Add delete hook and a hook to fetch all posts' categories in bulk

- Add `useDeleteCategory()` mutation that:
  1. Deletes all rows from `cms_content_categories` where `category_id` matches (the CASCADE should handle this, but explicit is safer)
  2. Deletes the category from `cms_categories`
  3. Invalidates the `cms-categories` query cache
  4. Shows success/error toasts

- Add `useAllContentCategories()` query that fetches all `cms_content_categories` joined with `cms_categories` to get category names, returning a map of `content_id -> category names[]`

#### 2. `src/pages/admin/ContentManagement.tsx` -- Display categories on post cards + add category delete UI

**Display categories on post cards (Blog Posts tab only):**
- Import `useAllContentCategories` and `Badge`
- In `renderContentCard`, for posts, show category badges next to the slug/date line
- If a post has no categories, show "Uncategorized" in a muted badge

**Add category management section:**
- Add a small "Manage Categories" area below the tab buttons (visible only when "Blog Posts" tab is active)
- List existing categories as small badges with an "X" delete button on each
- Add confirmation dialog before deletion
- When a category is deleted, the junction table rows are removed (CASCADE), so posts simply become uncategorized -- no posts are deleted

#### 3. `src/hooks/useCmsCategories.ts` -- useDeleteCategory implementation

```
useDeleteCategory():
  1. DELETE FROM cms_content_categories WHERE category_id = id
  2. DELETE FROM cms_categories WHERE id = id
  3. Invalidate ['cms-categories'] and ['all-content-categories']
```

### What Will NOT Change
- No layout restructuring
- No routing changes
- No schema/migration changes (CASCADE already handles unlinking)
- No changes to ContentEditor category selection UI
- No changes to unrelated CMS components
- No blog post data is ever deleted

### Summary of File Changes
| File | Change |
|------|--------|
| `src/hooks/useCmsCategories.ts` | Add `useDeleteCategory` and `useAllContentCategories` hooks |
| `src/pages/admin/ContentManagement.tsx` | Show category badges on post cards; add category delete UI with confirmation modal |

