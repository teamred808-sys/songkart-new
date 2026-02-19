

## Fix Center (and Justify) Text Alignment in Post Editor

### Problem
The Tiptap `TextAlign` extension sets `text-align` via inline style attributes on paragraph/heading elements, but Tailwind's `prose` class applies its own `text-align` rules which can override them due to CSS specificity.

### Solution
Add CSS rules in `src/index.css` to ensure ProseMirror's text-align styles take priority inside the editor.

### File: `src/index.css`

Add the following rules after the existing Tiptap image resizer styles (around line 476):

```css
/* Tiptap text alignment - ensure inline styles override prose defaults */
.ProseMirror p[style*="text-align: center"],
.ProseMirror h1[style*="text-align: center"],
.ProseMirror h2[style*="text-align: center"],
.ProseMirror h3[style*="text-align: center"],
.ProseMirror h4[style*="text-align: center"] {
  text-align: center !important;
}

.ProseMirror p[style*="text-align: right"],
.ProseMirror h1[style*="text-align: right"],
.ProseMirror h2[style*="text-align: right"],
.ProseMirror h3[style*="text-align: right"],
.ProseMirror h4[style*="text-align: right"] {
  text-align: right !important;
}

.ProseMirror p[style*="text-align: justify"],
.ProseMirror h1[style*="text-align: justify"],
.ProseMirror h2[style*="text-align: justify"],
.ProseMirror h3[style*="text-align: justify"],
.ProseMirror h4[style*="text-align: justify"] {
  text-align: justify !important;
}
```

### Why This Fixes It
- Tailwind's `prose` class sets default text alignment rules on `p`, `h1`-`h4`, etc.
- The Tiptap TextAlign extension applies `style="text-align: center"` as an HTML attribute, but `prose` rules have higher specificity
- Adding `!important` scoped to `.ProseMirror` elements with the matching style attribute ensures the editor's alignment always wins

### No other files changed

