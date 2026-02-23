

## Add "Free" Link to Navbar

### Summary
Add a "Free" navigation link in the header between "Browse" and "Sellers" (or after "Sellers") that links to `/browse?free=true`, matching the existing Free Downloads section filter.

### Changes

**File: `src/components/layout/Navbar.tsx`**

1. **Desktop nav (after "Sellers" link, ~line 63)** -- Add a new `<Link>` to `/browse?free=true` with a green-tinted style and a Gift icon to make it stand out:
   ```
   Browse  |  Sellers  |  Free
   ```

2. **Mobile nav (after "Sellers" link, ~line 190)** -- Add the same "Free" link in the mobile menu with consistent styling.

3. **Import** -- Add `Gift` from `lucide-react` for the icon next to the "Free" label.

The link will use a subtle green color (`text-green-500`) to visually distinguish it from other nav items, similar to the "Free Downloads" homepage section styling.

