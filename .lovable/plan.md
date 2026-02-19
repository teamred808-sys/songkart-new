
## Fix: Show Context-Appropriate "New" Button per Tab

### Problem
Both "New Page" and "New Post" buttons are always visible regardless of which tab is active. The user wants each button to appear only in its respective tab.

### Change

#### `src/pages/admin/ContentManagement.tsx` (lines 201-210)

Replace the current static button group with a conditional render based on `activeSection`:

- When `activeSection === 'pages'`: show only "New Page" button
- When `activeSection === 'posts'`: show only "New Post" button

```tsx
<div className="flex gap-2">
  {activeSection === 'pages' && (
    <Button onClick={() => navigate('/admin/content/new?type=page')}>
      <FileText className="h-4 w-4 mr-2" />
      New Page
    </Button>
  )}
  {activeSection === 'posts' && (
    <Button onClick={() => navigate('/admin/content/new?type=post')} variant="outline">
      <Newspaper className="h-4 w-4 mr-2" />
      New Post
    </Button>
  )}
</div>
```

### What Will NOT Change
- No layout restructuring
- No routing changes
- No database changes
- Only 1 file modified, ~8 lines changed
