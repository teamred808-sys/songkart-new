import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TARGET_SIZE = 512;

async function cropAndResize(imageSrc: string, cropArea: Area): Promise<File> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    cropArea.x, cropArea.y, cropArea.width, cropArea.height,
    0, 0, TARGET_SIZE, TARGET_SIZE,
  );

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
  );
  return new File([blob], 'cover.jpg', { type: 'image/jpeg' });
}

function getCenterCropArea(width: number, height: number): Area {
  const cropSize = Math.min(width, height);
  return {
    x: Math.round((width - cropSize) / 2),
    y: Math.round((height - cropSize) / 2),
    width: cropSize,
    height: cropSize,
  };
}

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  onComplete: (file: File) => void;
}

export function ImageCropModal({ open, imageSrc, onComplete }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const file = await cropAndResize(imageSrc, croppedArea);
      onComplete(file);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
      });
      const centerArea = getCenterCropArea(img.naturalWidth, img.naturalHeight);
      const file = await cropAndResize(imageSrc, centerArea);
      onComplete(file);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Crop Cover Image</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-72 bg-muted rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Adjust the crop area. Output: 512×512px. Cancelling will auto center-crop.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={processing}>
            {processing ? 'Processing…' : 'Cancel'}
          </Button>
          <Button onClick={handleConfirm} disabled={processing || !croppedArea}>
            {processing ? 'Processing…' : 'Confirm Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
