

## Add Image Resize Support to Post Editor

### Problem
Images inserted into the rich text editor cannot be resized. There are no drag handles or controls to adjust image dimensions after insertion.

### Solution
Replace the default `@tiptap/extension-image` with the `tiptap-extension-resize-image` package, which is a drop-in replacement that adds visual drag handles for resizing images directly in the editor.

---

### Changes

#### 1. Install `tiptap-extension-resize-image`

Add the npm package which provides resize handles, alignment controls, and min/max width constraints.

#### 2. Update `src/components/cms/RichTextEditor.tsx`

- Replace `import Image from '@tiptap/extension-image'` with `import ImageResize from 'tiptap-extension-resize-image'`
- Replace `Image.configure(...)` with `ImageResize.configure(...)` in the extensions array, keeping the same HTML attributes class
- Optionally set `minWidth` and `maxWidth` constraints (e.g., 100px min, full container max)

**Before:**
```tsx
import Image from '@tiptap/extension-image';

// In extensions:
Image.configure({
  HTMLAttributes: {
    class: 'rounded-lg max-w-full',
  },
}),
```

**After:**
```tsx
import ImageResize from 'tiptap-extension-resize-image';

// In extensions:
ImageResize.configure({
  HTMLAttributes: {
    class: 'rounded-lg max-w-full',
  },
  minWidth: 100,
}),
```

#### 3. Add resize handle styles to `src/index.css`

Add minimal CSS to style the resize handles so they're visible against the dark editor background:

```css
/* Tiptap image resize handles */
.image-resizer {
  display: inline-flex;
  position: relative;
}
.image-resizer .resize-trigger {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 12px;
  height: 12px;
  background: hsl(var(--primary));
  border-radius: 2px;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.2s;
}
.image-resizer:hover .resize-trigger,
.image-resizer.resizing .resize-trigger {
  opacity: 1;
}
```

---

### Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `tiptap-extension-resize-image` dependency |
| `src/components/cms/RichTextEditor.tsx` | Swap `@tiptap/extension-image` for `tiptap-extension-resize-image` |
| `src/index.css` | Add resize handle styling |

### Result
After this change, clicking on any image in the editor will show drag handles on the corners/edges, allowing the user to resize images by dragging. The `setImage` chain command remains the same, so drag-and-drop upload and toolbar image insertion continue to work unchanged.

