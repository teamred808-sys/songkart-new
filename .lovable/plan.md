

## Mutual Exclusivity for License Tier Selection

### Overview
Add frontend state logic to enforce that Exclusive is mutually exclusive with Personal Use and Commercial in both the Upload and Edit song pages. No backend, validation, or submission changes.

### Rules
- Selecting **Exclusive** auto-removes Personal and Commercial tiers, and disables their buttons
- Selecting **Personal** or **Commercial** auto-removes Exclusive tier, and disables its button
- Personal and Commercial can coexist freely
- Deselecting all tiers re-enables everything

---

### Change 1: `src/pages/seller/UploadSong.tsx`

**Modify `addLicenseTier` function (line 194-211):**
- When adding `exclusive`: filter out any existing `personal` and `commercial` tiers first
- When adding `personal` or `commercial`: filter out any existing `exclusive` tier first

**Modify tier button rendering (lines 734-749):**
- Compute `hasExclusive` = exclusive tier is selected
- Compute `hasNonExclusive` = personal or commercial tier is selected
- Disable `exclusive` button when `hasNonExclusive` is true
- Disable `personal` and `commercial` buttons when `hasExclusive` is true
- Apply `opacity-50 cursor-not-allowed` styling to disabled buttons

---

### Change 2: `src/pages/seller/EditSong.tsx`

**Modify `availableLicenseTypes` filter (line 228):**
- Additionally filter out `exclusive` if any `personal` or `commercial` tier exists
- Additionally filter out `personal` and `commercial` if `exclusive` tier exists
- This prevents adding conflicting tiers via the "Add License Type" buttons

**Modify `handleAddLicenseTier` (line 178):**
- When adding `exclusive`: remove existing `personal` and `commercial` tiers first
- When adding `personal` or `commercial`: remove existing `exclusive` tier first

---

### What stays the same
- Backend license mapping and pricing calculation
- Form structure and tier detail components
- Validation and submission flow
- Next step behavior
- All styling (just adding disabled state visuals)

