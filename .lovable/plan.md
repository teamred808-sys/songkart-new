

## Fix: Display Categories on Published Blog Post Page

### Problem
The `BlogPost.tsx` page does not fetch or display categories for the published post. The categories are saved correctly in the database but the public-facing blog post page never queries `cms_content_categories` to retrieve them.

### Change

#### `src/pages/BlogPost.tsx`
- Import `useContentCategories` and `useCategories` from `useCmsCategories`
- Import `Badge` from UI components
- Fetch the post's category IDs using `useContentCategories(post?.id)`
- Fetch all categories using `useCategories()` to resolve IDs to names
- Display matching category names as badges in the post header, between the author/date line and the excerpt
- Show nothing extra if no categories are assigned

### What stays the same
- No layout restructuring
- No routing changes
- No database changes
- 1 file modified

