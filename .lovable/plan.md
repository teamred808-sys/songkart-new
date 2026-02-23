

## Reduce Song Detail Hero Artwork Size

### Problem
The artwork container currently spans the full width of the 2-column area (`lg:col-span-2`) with `aspect-square`, resulting in a very large square image that dominates the page.

### Fix

**File: `src/pages/SongDetail.tsx`**

1. **Line 215** -- Wrap the artwork in a constrained container:
   - Add `max-w-md mx-auto` to the artwork `div` so it caps at ~448px wide and centers within the column
   - This keeps the 1:1 square ratio but at a reasonable size

2. **Line 101** -- Update the loading skeleton to match:
   - Add `max-w-md mx-auto` to the skeleton's className

### Result
- Artwork displays as a centered 1:1 square, capped at ~448px
- No stretching, no layout breakage
- Responsive: on small screens it still shrinks naturally below 448px

