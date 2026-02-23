

## Remove Default Prices from License Tier Selection

### Problem
When a seller selects a license tier (Personal, Commercial, Exclusive), the price field is pre-filled with hardcoded default values (29.99, 99.99, 499.99). The seller should enter their own price -- the field should start empty.

### Fix

**File: `src/pages/seller/UploadSong.tsx` (lines 200-204, 217)**

Replace the `defaultPrices` map and the tier creation logic so new tiers start with a price of `0` (empty input):

```typescript
// Before
const defaultPrices: Record<string, number> = {
  personal: 29.99,
  commercial: 99.99,
  exclusive: 499.99,
};
// ...
{ license_type: type, price: defaultPrices[type], terms: '' }

// After
{ license_type: type, price: 0, terms: '' }
```

Then update the price input to show an empty field when the value is `0` by using a placeholder instead:

```typescript
// Price input: show empty string when 0
value={tier.price || ''}
placeholder="Enter price"
```

This ensures sellers see an empty price field and must enter their own price. No layout or validation changes needed -- the existing schema already requires price > 0.

