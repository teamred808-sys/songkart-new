

## Add Price Input Clamping for License Tiers

### What
Add max-price clamping on the license tier price inputs in `UploadSong.tsx`:
- **Personal Use**: clamped to max 500
- **Commercial**: clamped to max 3000
- **Exclusive**: no max limit

### Change: `src/pages/seller/UploadSong.tsx`

**Modify the price `<Input>` inside the license tier details (lines 791-796):**

Add a `max` attribute and update the `onChange` handler to clamp the value:

```tsx
<Input
  type="number"
  step="0.01"
  min="0"
  max={tier.license_type === 'personal' ? 500 : tier.license_type === 'commercial' ? 3000 : undefined}
  value={tier.price}
  onChange={(e) => {
    let val = parseFloat(e.target.value) || 0;
    if (tier.license_type === 'personal' && val > 500) val = 500;
    if (tier.license_type === 'commercial' && val > 3000) val = 3000;
    updateLicenseTier(tier.license_type, 'price', val);
  }}
/>
```

### What stays the same
- Base Price input (untouched)
- UI layout, styling, form structure
- Tier selection logic (mutual exclusivity)
- Backend pricing, validation, submission flow
- Review step navigation
- EditSong page (not in scope)

