

## Make Blog Posts the Default Active Section

### Change
In `src/pages/admin/ContentManagement.tsx`, update the `activeSection` state default from `'pages'` to `'posts'` so that Blog Posts is shown first when an admin navigates to the Content Management screen.

### File: `src/pages/admin/ContentManagement.tsx`

**Line 25 — Change:**
```tsx
// Before
const [activeSection, setActiveSection] = useState<'pages' | 'posts'>('pages');

// After
const [activeSection, setActiveSection] = useState<'pages' | 'posts'>('posts');
```

One line change. Nothing else is modified.

