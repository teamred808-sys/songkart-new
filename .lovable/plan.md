

## Remove "Lyrics" and "Audio" Links from Navbar

### Problem
The navbar (both desktop and mobile) shows separate "Lyrics" and "Audio" navigation links. Since compositions (audio) are now compulsory, these separate category links are no longer needed.

### Changes

**File: `src/components/layout/Navbar.tsx`**

1. **Desktop nav (lines 58-69)** -- Remove the two `<Link>` elements for "Lyrics" (`/browse?type=lyrics`) and "Audio" (`/browse?type=audio`).

2. **Mobile nav (lines 196-209)** -- Remove the same two `<Link>` elements from the mobile menu.

Only "Browse" and "Sellers" links will remain in the navigation.

