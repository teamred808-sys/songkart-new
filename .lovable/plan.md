

## Add Text Alignment Options to Post Editor

### Problem
The Tiptap editor currently has no text alignment controls. The `TextAlign` extension is not installed and no alignment buttons exist in the toolbar.

### Solution
Add the `@tiptap/extension-text-align` extension and add alignment buttons (Left, Center, Right, Justify) to the editor toolbar.

### File Changes

#### 1. `src/components/cms/RichTextEditor.tsx`
- Import `TextAlign` from `@tiptap/extension-text-align`
- Add it to the extensions array, configured for paragraph and heading nodes:
  ```tsx
  TextAlign.configure({ types: ['heading', 'paragraph'] })
  ```

#### 2. `src/components/cms/EditorToolbar.tsx`
- Import `AlignLeft`, `AlignCenter`, `AlignRight`, `AlignJustify` icons from `lucide-react`
- Add a new alignment section in the toolbar (after the Lists section) with four buttons:
  - Align Left (default)
  - Align Center
  - Align Right
  - Justify
- Each button calls `editor.chain().focus().setTextAlign('left'|'center'|'right'|'justify').run()`
- Active state highlights the current alignment

### New Dependency
- `@tiptap/extension-text-align` — needs to be installed

### No other files are changed
