

## Add Categories Feature to Blog Post Editor

### Overview
Add a "Categories" card to the post editor sidebar (similar to the reference image) that lets admins select existing categories via checkboxes and create new ones inline with a text input + add button.

### Database Changes

#### 1. New table: `cms_categories`
Stores available categories.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, UNIQUE |
| slug | text | NOT NULL, UNIQUE |
| created_at | timestamptz | default now() |

RLS policies:
- SELECT: anyone (true)
- ALL: admins only

#### 2. New junction table: `cms_content_categories`
Links posts to categories (many-to-many).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| content_id | uuid | NOT NULL, FK to cms_content(id) ON DELETE CASCADE |
| category_id | uuid | NOT NULL, FK to cms_categories(id) ON DELETE CASCADE |
| created_at | timestamptz | default now() |
| UNIQUE(content_id, category_id) | | |

RLS policies:
- SELECT: anyone (true)
- ALL: admins only

### Code Changes

#### 1. New hook: `src/hooks/useCmsCategories.ts`
- `useCategories()` -- fetches all categories
- `useCreateCategory()` -- inserts a new category
- `useContentCategories(contentId)` -- fetches category IDs for a post
- `useSaveContentCategories()` -- replaces categories for a post (delete all + insert selected)

#### 2. Update: `src/pages/admin/ContentEditor.tsx`
- Add a "Categories" card in the right sidebar (between Excerpt and Featured Image), shown only when content type is `post`
- Lists all categories as checkboxes
- Shows a separator, then a text input + purple "+" button to add a new category inline
- On save/publish, also saves selected categories via `useSaveContentCategories`
- Load existing categories on edit via `useContentCategories`

### UI Design (matching reference image)
- Card with title "Categories"
- Checkbox list of all existing categories
- Separator line
- Row with text input (placeholder "New category") and a purple "+" icon button
- Adding a new category immediately creates it in the database and checks it

