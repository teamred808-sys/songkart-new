
## Fix: Blog Posts Appearing in Resources Footer Section

### Problem
Two content items ("Blog" and "Both must use the same original card component") are stored in the database with `type = 'page'` instead of `type = 'post'`. The footer's Resources section correctly queries for pages only, but these blog posts were saved as pages by mistake, so they show up there instead of only on the /blog page.

### Fix

#### 1. Database Migration -- Fix existing mistyped records
Run a migration to update the two blog posts that were incorrectly saved as `type = 'page'` to `type = 'post'`:

```sql
UPDATE cms_content
SET type = 'post'
WHERE slug IN ('blog', 'both-must-use-the-same-original-card-component')
  AND type = 'page';
```

This removes them from the footer's Resources section and makes them appear on the /blog page instead.

#### 2. No code changes needed
- The `usePublishedPages` hook already filters by `type = 'page'` -- correct behavior
- The `usePublishedPosts` hook already filters by `type = 'post'` -- correct behavior
- The footer Resources section only shows pages -- correct behavior
- The /blog page only shows posts -- correct behavior

The root cause was simply that these posts were created without the `?type=post` URL parameter, so they defaulted to `type = 'page'`.
