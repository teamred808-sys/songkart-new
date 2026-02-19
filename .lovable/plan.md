

## Restructure Content Management: Remove Tabs, Show Two Independent Sections

### Problem
The current Content Management page uses a tab-based layout with an "All Content" tab that mixes pages and blog posts together. The user wants two clearly separated, always-visible sections instead.

### Changes

#### File: `src/pages/admin/ContentManagement.tsx`

**Remove:**
- The `activeTab` state and tab-based filtering
- The `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` components and their import
- The single combined content list

**Add:**
- Two separate calls to `useContentList`: one with `'page'` and one with `'post'`
- Two independent sections, each with its own heading, content list, and empty state:

```
Pages Management
----------------
[Table/list of pages with Title, Slug, Status, Last Updated, Actions]

Blog Posts Management
---------------------
[Table/list of blog posts with Title, Slug, Status, Last Updated, Actions]
```

**Each section displays:**
- Content type icon + Title
- Slug (e.g., `/privacy-policy`)
- Published status badge (Published / Draft / Scheduled / Archived)
- Last updated date
- Action buttons: View, Edit, Delete, Publish/Unpublish

**Search** remains at the top and filters both sections simultaneously.

**Structure sketch:**
- Header with "New Page" and "New Post" buttons (unchanged)
- Search bar (unchanged)
- "Pages Management" section heading with FileText icon
  - List of pages (filtered by search), or "No pages found" empty state
- "Blog Posts Management" section heading with Newspaper icon
  - List of blog posts (filtered by search), or "No blog posts found" empty state
- Delete confirmation dialog (unchanged)

### Technical Details

- Replace single `useContentList(type)` call with two: `useContentList('page')` and `useContentList('post')`
- Remove `activeTab` state entirely
- Extract the content card rendering into a helper function to avoid duplicating the card JSX
- Apply the `search` filter independently to both lists
- Both sections use the same `getStatusBadge`, delete, publish, and unpublish handlers

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/ContentManagement.tsx` | Remove tabs, render two independent sections with separate data queries |

### No Database Changes
Existing content remains untouched. This is purely a UI restructure.

