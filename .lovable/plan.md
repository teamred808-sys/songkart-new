

## Fix: View Button URL for Blog Posts

### Problem Found
The **View (Eye)** button in the content management page always links to `/${item.slug}` regardless of content type. However, blog posts use the route `/blog/:slug`, not `/:slug`. This means clicking View on any blog post opens the wrong URL.

The other three buttons work correctly:
- **Hide/Publish toggle (EyeOff/Globe)**: Correctly calls unpublish/publish mutations
- **Edit (Pencil)**: Correctly links to `/admin/content/${item.id}/edit`
- **Delete (Trash2)**: Correctly opens confirmation dialog and deletes

### Fix

#### File: `src/pages/admin/ContentManagement.tsx`
Update the View button link (line 102) to use the correct path based on content type:
- For pages: `/${item.slug}` (current behavior, correct)
- For posts: `/blog/${item.slug}` (new, correct behavior)

Change:
```tsx
<Link to={`/${item.slug}`} target="_blank">
```
To:
```tsx
<Link to={item.type === 'post' ? `/blog/${item.slug}` : `/${item.slug}`} target="_blank">
```

This is a one-line change in the `renderContentCard` function.
