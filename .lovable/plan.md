

## Clickable Section Navigation for Content Management

### Problem
The current layout shows both Pages and Blog Posts stacked together. The user wants separate clickable sections where clicking "Pages" shows only pages, and clicking "Blog Posts" shows only blog posts.

### Solution
Add an `activeSection` state that toggles between `'pages'` and `'posts'`. Render two clickable section buttons at the top of the content area. Only the selected section's content list is displayed.

### File: `src/pages/admin/ContentManagement.tsx`

**Changes:**
1. Add `activeSection` state: `useState<'pages' | 'posts'>('pages')`
2. Replace the two stacked sections with two clickable buttons/cards styled as section selectors
3. Conditionally render only the active section's content list below

**Layout:**
```
Content Management header + New Page / New Post buttons (unchanged)
Search bar (unchanged)

[ Pages ]  [ Blog Posts ]    <-- clickable section selectors, active one highlighted
                              
[Content list for active section only]

Delete dialog (unchanged)
```

**Section selector design:**
- Two side-by-side buttons using existing styling patterns
- Active section gets `bg-primary text-primary-foreground` styling
- Inactive section gets `bg-card border` styling (ghost/outline look)
- Each shows the section name and item count (e.g., "Pages (3)")

**Rendering logic:**
- When `activeSection === 'pages'`: show filtered pages list or "No pages found" empty state
- When `activeSection === 'posts'`: show filtered posts list or "No blog posts found" empty state
- Search filters only the active section's content

### No other files modified
Only `src/pages/admin/ContentManagement.tsx` changes. No layout containers, parent components, or global styles are touched.

