

## Add Artwork Crop Flow to Song Upload

### Summary
When a seller uploads cover artwork, the system will check the aspect ratio. If it's already 1:1, it resizes to 512x512 and accepts it. If not, a crop modal opens with a fixed 1:1 ratio. Confirming saves the cropped result at 512x512. Cancelling auto-performs a center crop and resizes to 512x512. No raw non-square image is ever stored.

### New Dependency
- `react-easy-crop` -- lightweight React cropping component with fixed aspect ratio support

### New File: `src/components/seller/ImageCropModal.tsx`
A modal dialog containing:
- `react-easy-crop` component with `aspect={1}` (locked 1:1 ratio)
- "Confirm Crop" and "Cancel" buttons
- On confirm: crops to user selection, resizes to 512x512 via canvas, returns the resulting `File`
- On cancel: auto center-crops (shortest side), resizes to 512x512 via canvas, returns the resulting `File`
- Helper function `getCroppedImage(imageSrc, cropArea)` using an offscreen canvas to extract and resize

### Changes to: `src/pages/seller/UploadSong.tsx`

**New state variables:**
- `cropImageSrc: string | null` -- the raw image data URL for the crop modal
- `showCropModal: boolean` -- controls modal visibility
- `rawCoverFile: File | null` -- temporary hold of the original file

**Updated `handleFileChange` for `cover_image`:**
1. Read the selected file as a data URL
2. Load it into an `Image` to check dimensions
3. If width === height (1:1): resize to 512x512 via canvas, set as `cover_image`, show preview
4. If not 1:1: set `cropImageSrc` and open the crop modal

**New `handleCropComplete(croppedFile: File)` callback:**
- Receives the 512x512 cropped `File` from the modal
- Sets it as `content.cover_image`
- Generates preview URL
- Closes modal

**New `handleCropCancel()` callback:**
- Triggers the auto center-crop logic inside the modal (or inline):
  - `cropSize = min(width, height)`
  - `x = (width - cropSize) / 2`, `y = (height - cropSize) / 2`
  - Draw to 512x512 canvas
- Sets result as `cover_image`, shows preview, closes modal

**UI addition:**
- Render `<ImageCropModal>` component conditionally when `showCropModal` is true

### Technical Details

**Canvas-based resize/crop utility (inside `ImageCropModal.tsx`):**
```text
function cropAndResize(image, cropArea, targetSize=512):
  canvas = new OffscreenCanvas(targetSize, targetSize)
  ctx = canvas.getContext('2d')
  ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, targetSize, targetSize)
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
```

**Center crop fallback (on cancel):**
```text
cropSize = min(naturalWidth, naturalHeight)
x = (naturalWidth - cropSize) / 2
y = (naturalHeight - cropSize) / 2
cropArea = { x, y, width: cropSize, height: cropSize }
→ pass to cropAndResize()
```

### What stays unchanged
- Upload UI layout (file input, preview thumbnail, remove button)
- Storage bucket and path logic
- Publishing flow and submission handler
- Cover image preview display (still shows the 132x132 thumbnail)
- Artwork help text (will update "Recommended" to say "Output: 512x512px")

