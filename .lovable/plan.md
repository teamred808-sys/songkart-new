
## Remove Base Price Field from Song Upload

### Summary
Remove the "Base Price" input from the upload form since sellers set prices per license tier, making the standalone base price redundant.

### Changes

**File: `src/pages/seller/UploadSong.tsx`**

1. **Remove the Base Price input** (lines 731-740): Delete the entire `<div>` containing the "Base Price" label and input field.

2. **Update the pricing schema** (line 54): Remove `base_price` validation or make it optional since it won't be user-facing:
   ```typescript
   const pricingSchema = z.object({
     base_price: z.number().optional(),
     license_tiers: z.array(licenseTierSchema).min(1, 'At least one license tier required'),
   });
   ```

3. **Auto-derive base_price on submit** (around line 309): Instead of using the user-entered value, automatically set `base_price` to the lowest license tier price:
   ```typescript
   base_price: Math.min(...pricing.license_tiers.map(t => t.price)) || 0,
   ```

4. **Update initial state** (line 127): Change default from `29.99` to `0`:
   ```typescript
   const [pricing, setPricing] = useState<PricingForm>({ base_price: 0, license_tiers: [] });
   ```

### What stays the same
- The `base_price` column in the database (it has a default of 0, so no migration needed)
- UI layout, license tier selection, and pricing inputs per tier
- All other form steps and submission logic
