
## AVIF Image Compression for CMS Uploads

### Overview
Add automatic server-side AVIF conversion for all newly uploaded CMS images. Original images are preserved; AVIF versions are generated at upload time only and used for frontend rendering with automatic fallback.

### Important Note on Sharp
Sharp requires native binaries (libvips) which may have limited support in the Deno-based backend function runtime. The implementation will use `npm:sharp` via Deno's npm compatibility layer. If deployment fails due to binary incompatibility, a fallback approach using built-in storage image transformations will be needed.

---

### Step 1 -- Database Migration

Add an `avif_url` column to the `cms_media` table to store the compressed image URL alongside the original.

```sql
ALTER TABLE cms_media ADD COLUMN avif_url text;
```

- Nullable so existing records are unaffected
- No existing data modified

---

### Step 2 -- Backend Function: `compress-image`

Create `supabase/functions/compress-image/index.ts`:

- Accepts `{ storagePath: string }` in POST body
- Authenticates the caller (JWT required)
- Downloads the original image from the `cms-media` storage bucket using service role
- Converts to AVIF using Sharp with quality 55, effort 5
- Skips SVG and GIF files (not suitable for AVIF conversion)
- Uploads the AVIF file to `cms-media` bucket at `uploads/avif/<original-name>.avif`
- Returns `{ avifUrl: "<public url>" }`

Config in `supabase/config.toml`:
```toml
[functions.compress-image]
verify_jwt = true
```

---

### Step 3 -- Upload Hook Changes

Modify `src/hooks/useCmsMedia.ts`:

After the original file is uploaded and the `cms_media` record is created:

1. Call the `compress-image` backend function with the storage path
2. If successful, update the `cms_media` record with the returned `avif_url`
3. If AVIF generation fails, silently continue (original image still works)
4. Update the `CmsMedia` interface to include `avif_url: string | null`

No changes to validation, allowed types, or file size limits.

---

### Step 4 -- Frontend Rendering (Minimal Changes)

Update image sources to prefer `avif_url` where CMS media URLs are used:

- **`src/pages/Blog.tsx`**: Use `post.featured_image` as-is (this comes from `cms_content.featured_image` which stores whatever URL was set -- see next point)
- **`src/pages/BlogPost.tsx`**: Same as above
- **`src/pages/admin/ContentEditor.tsx`**: When `handleFeaturedImageUpload` receives the upload result, use `result.avif_url || result.public_url` as the `featuredImage` value
- **`src/components/cms/RichTextEditor.tsx`**: When inserting images after drag-drop upload, use `result.avif_url || result.public_url` as the `src`

This means new uploads will automatically store the AVIF URL in the content/featured image fields. Existing posts keep their original URLs untouched.

---

### Step 5 -- Redeploy Safety

- AVIF generation happens only inside the upload mutation, triggered by user action
- No background jobs, no cron, no on-deploy hooks
- All URLs (original + AVIF) persist in the database
- Existing images are never reprocessed

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/compress-image/index.ts` | New -- AVIF conversion function |
| `supabase/config.toml` | Add `compress-image` JWT config |
| Database migration | Add `avif_url` column to `cms_media` |
| `src/hooks/useCmsMedia.ts` | Call compress function after upload, update interface |
| `src/pages/admin/ContentEditor.tsx` | Use `avif_url` fallback for featured image |
| `src/components/cms/RichTextEditor.tsx` | Use `avif_url` fallback for inline images |

No layout, routing, or styling changes. No existing data modified.
