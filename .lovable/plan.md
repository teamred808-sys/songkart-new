

## Fix: Show Categories When Creating a New Post

### Root Cause
When creating new content, the content type is determined by the URL query parameter (`?type=post` or `?type=page`). If a user navigates to `/admin/content/new` without the `?type=post` parameter (or clicks "New Page" instead of "New Post"), the editor defaults to "page" mode, which hides the Categories card. There is no way to switch between Page and Post within the editor itself.

### Solution
Add a content type toggle (Page / Post) to the new content editor so the user can switch types, which will dynamically show or hide the Categories card. This toggle only appears when creating new content (not when editing existing content, since the type is already set).

### File Changes

#### `src/pages/admin/ContentEditor.tsx`
- Add a `selectedType` state initialized from the URL query param (`defaultType`)
- Add a simple toggle (two buttons or a Select dropdown) below the page title, visible only when `isNew` is true
- Update `contentType` derivation to use `selectedType` for new content:
  - `const contentType = existingContent?.type || selectedType;`
- When user switches type, the Categories card will automatically show/hide based on the existing `contentType === 'post'` condition
- Update the `handleSave` and `handlePublish` calls to use the selected type

### What Will NOT Change
- No layout restructuring
- No routing changes
- No database changes
- No changes to the categories UI itself
- Existing edit flow remains unchanged
