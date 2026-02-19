

## Auto-Fill Excerpt and SEO Settings from Blog Content

### What Changes
When the admin writes blog content, the excerpt, SEO title, and SEO description will be automatically generated from the content -- but only if the admin hasn't manually edited them.

### Logic
- **Excerpt**: Extract the first ~200 characters of plain text from the editor's HTML output (strip tags). Auto-fills only if the excerpt field is empty and hasn't been manually edited.
- **SEO Title**: Mirror the blog title (truncated to 60 chars). Auto-fills only if the SEO title field is empty and hasn't been manually edited.
- **SEO Description**: Same as excerpt but truncated to 155 characters. Auto-fills only if not manually edited.
- Once the admin manually types into any of these fields, that field stops auto-updating (tracked via `useRef` flags).

### File: `src/pages/admin/ContentEditor.tsx`

**Changes:**
1. Add three `useRef<boolean>` flags: `excerptManuallyEdited`, `seoTitleManuallyEdited`, `seoDescManuallyEdited` -- all default to `false`
2. Add a helper function `stripHtml(html: string): string` that removes HTML tags and extra whitespace to get plain text
3. Update `handleEditorChange` to auto-fill excerpt and SEO description from content text (if not manually edited)
4. Add a `useEffect` on `title` to auto-fill `seoTitle` (if not manually edited)
5. Update the `onChange` handlers for excerpt, seoTitle, and seoDescription inputs to set their respective manual-edit flags to `true`
6. When loading existing content, set all manual-edit flags to `true` (so existing values aren't overwritten)

**Auto-fill behavior:**
- New post: As admin types content, excerpt and SEO fields fill automatically
- Existing post: All fields keep their saved values (manual flags set on load)
- Manual override: Once admin types in a field, it stops auto-updating

### No other files modified
Only `src/pages/admin/ContentEditor.tsx` is changed.

