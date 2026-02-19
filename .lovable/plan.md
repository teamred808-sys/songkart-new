

## Fix: Add Image Upload and Drag-and-Drop Support to Content Editor

### Problem
1. **Rich Text Editor**: The image button opens a dialog with upload support, but dragging and dropping images directly into the editor area does nothing.
2. **Featured Image**: Only accepts a URL input -- no file upload button or drag-and-drop zone.

The upload infrastructure (`useUploadMedia` hook + `cms-media` storage bucket) already exists and works. The fix is purely about wiring up the UI.

---

### Changes

#### 1. `src/components/cms/RichTextEditor.tsx` -- Add drag-and-drop image upload

- Import and use `useUploadMedia` from `useCmsMedia.ts`
- Add `onDrop` and `onDragOver` handlers to the editor wrapper `div`
- When an image file is dropped, upload it via `useUploadMedia`, then insert the returned public URL into the editor using `editor.chain().focus().setImage()`
- Show a visual drop indicator (border highlight) while dragging over the editor

#### 2. `src/pages/admin/ContentEditor.tsx` -- Add Featured Image upload with drag-and-drop

Replace the simple URL input in the Featured Image card with:
- A **drag-and-drop zone** with visual feedback (dashed border, icon, helper text)
- A **"Choose File" upload button** that triggers a hidden file input
- An **"Or enter URL" divider** followed by the existing URL input
- A **preview with remove button** when an image is set
- Use the same `useUploadMedia` hook for uploads
- On successful upload, set `featuredImage` to the returned `public_url`

---

### Technical Details

**RichTextEditor.tsx changes:**
```tsx
// Add to imports
import { useUploadMedia } from '@/hooks/useCmsMedia';

// Inside component
const uploadMedia = useUploadMedia();
const [isDragging, setIsDragging] = useState(false);

const handleDrop = useCallback(async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const file = e.dataTransfer.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  const result = await uploadMedia.mutateAsync({ file, altText: file.name });
  editor?.chain().focus().setImage({ src: result.public_url, alt: result.alt_text || '' }).run();
}, [editor, uploadMedia]);

// Add onDragOver, onDragLeave, onDrop to wrapper div
// Add visual drag indicator class when isDragging is true
```

**ContentEditor.tsx Featured Image section changes:**
```tsx
// Replace simple Input with drop zone + upload button + URL input
<div
  onDrop={handleFeaturedImageDrop}
  onDragOver={...}
  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer"
>
  <Upload icon />
  <p>Drag & drop image here</p>
  <Button>Choose File</Button>
</div>
<div>Or enter URL</div>
<Input value={featuredImage} ... />
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/cms/RichTextEditor.tsx` | Add drag-and-drop image upload handler with visual feedback |
| `src/pages/admin/ContentEditor.tsx` | Replace Featured Image URL-only input with upload zone + drag-and-drop + URL fallback |

