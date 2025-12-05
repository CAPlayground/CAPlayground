"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface BlurEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  filename?: string;
  onApply: (file: File) => Promise<void>;
}

export function BlurEditor({
  open,
  onOpenChange,
  src,
  filename,
  onApply,
}: BlurEditorProps) {
  const [blurAmount, setBlurAmount] = useState(0);
  const [applying, setApplying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (open) {
      setBlurAmount(0);
      setLoaded(false);
    }
  }, [open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match image natural size
    if (img.naturalWidth && img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image with blur filter
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none"; // Reset filter
  }, [blurAmount, src, open, loaded]);

  const handleApply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setApplying(true);
    try {
      let mime = "image/png";
      const m = /^data:(image\/[a-zA-Z0-9.+-]+);/.exec(src);
      if (m && m[1]) {
        mime = m[1];
      }

      const file = await new Promise<File>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blurred image"));
              return;
            }
            const name = filename || "blurred-image.png";
            const file = new File([blob], name, { type: mime });
            resolve(file);
          },
          mime,
          mime === "image/jpeg" ? 0.9 : undefined
        );
      });

      await onApply(file);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Blur Image</DialogTitle>
          <DialogDescription>
            Adjust the blur amount and apply to replace the current image.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center bg-checkers">
            <div className="relative max-h-[320px] w-full flex items-center justify-center">
              {/* Hidden source image for reference */}
              <img
                ref={imgRef}
                src={src}
                alt=""
                className="hidden"
                onLoad={() => {
                  // Trigger initial draw
                  setLoaded(true);
                }}
              />
              <canvas
                ref={canvasRef}
                className="max-h-[320px] max-w-full object-contain"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="blur-amount">Blur Amount: {blurAmount}px</Label>
            </div>
            <Slider
              id="blur-amount"
              min={0}
              max={50}
              step={1}
              value={[blurAmount]}
              onValueChange={([v]) => setBlurAmount(v)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={applying}>
              {applying ? "Applying..." : "Apply Blur"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
