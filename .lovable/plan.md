
## Soften Admin Panel Borders

### Problem
The card borders across the admin dashboard are too harsh/prominent against the dark background, creating a visually jarring effect instead of a smooth, premium feel.

### Solution
Reduce the border opacity/lightness in the global CSS variable so all cards, stat boxes, charts, and sections have subtler, more soothing borders.

### File Changes

#### `src/index.css` (line 68)
- Change `--border: 240 10% 15%;` to `--border: 240 10% 11%;`
- This reduces the lightness from 15% to 11%, making borders blend more naturally with the dark background while still being visible
- This single change affects all Card components, inputs, and bordered elements site-wide since they all reference this CSS variable

### What Will NOT Change
- No component files modified
- No layout changes
- No database changes
- Just 1 line in the CSS file
