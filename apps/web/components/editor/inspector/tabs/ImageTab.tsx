"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import type { InspectorTabProps } from "../types";
import type { ImageLayer } from "@/lib/ca/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BlurEditor } from "../../tools/BlurEditor";
import { useAssetUrl } from "@/hooks/use-asset-url";

interface ImageTabProps extends Omit<InspectorTabProps, 'getBuf' | 'setBuf' | 'clearBuf' | 'round2' | 'fmt2' | 'fmt0' | 'updateLayerTransient' | 'selectedBase'> {
  replaceImageForLayer: (id: string, file: File) => Promise<void>;
  activeState?: string;
}

export function ImageTab({
  selected,
  updateLayer,
  replaceImageForLayer,
  activeState,
}: ImageTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inState = !!activeState && activeState !== 'Base State';
  const [cropOpen, setCropOpen] = useState(false);
  const [blurOpen, setBlurOpen] = useState(false);

  const imageLayer = selected.type === 'image' ? (selected as ImageLayer) : null;

  const { src: imageSrc } = useAssetUrl({
    cacheKey: imageLayer?.id ?? "",
    assetSrc: imageLayer?.src,
    skip: !imageLayer,
  });

  const filename = imageLayer?.src?.split("/").pop() ?? imageLayer?.name ?? "image.png";

  if (!imageLayer) return null;

  const canCrop = !!imageSrc && !inState;

  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      <div className="space-y-1 col-span-2">
        <Label>Image</Label>
        {imageSrc && (
          <div className="flex justify-center rounded-md border bg-secondary/20 p-2">
            <img
              src={imageSrc}
              alt={selected.name || "Image layer"}
              className="max-h-[200px] max-w-full object-contain"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={inState}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace Image…
                </Button>
              </div>
            </TooltipTrigger>
            {inState && <TooltipContent sideOffset={6}>Not supported for state transitions</TooltipContent>}
          </Tooltip>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                const img = new Image();
                const src = imageLayer.src;
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = reject;
                  img.src = src;
                });
                const w = img.naturalWidth || 0;
                const h = img.naturalHeight || 0;
                if (w > 0 && h > 0) {
                  updateLayer(selected.id, { size: { ...selected.size, w, h } });
                }
              } catch (e) {
              }
            }}
          >
            Reset Bounds
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp,image/svg+xml"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await replaceImageForLayer(selected.id, file);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
        </div>
      </div>
      <div className="space-y-1 col-span-2">
        <Label>Edit</Label>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!canCrop}
            onClick={() => {
              if (canCrop) {
                setCropOpen(true);
              }
            }}
          >
            Crop
          </Button>
          {imageSrc && (
            <ImageCropDialog
              open={cropOpen}
              onOpenChange={setCropOpen}
              src={imageSrc}
              filename={filename}
              onApply={async (file, dims, maintainBounds) => {
                await replaceImageForLayer(selected.id, file);
                if (!maintainBounds && dims) {
                  updateLayer(selected.id, {
                    size: { ...selected.size, w: dims.width, h: dims.height },
                  });
                }
              }}
            />
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!imageSrc || inState}
            onClick={() => {
              if (imageSrc && !inState) {
                setBlurOpen(true);
              }
            }}
          >
            Blur
          </Button>
          {imageSrc && (
            <BlurEditor
              open={blurOpen}
              onOpenChange={setBlurOpen}
              src={imageSrc}
              filename={filename}
              onApply={async (file) => {
                await replaceImageForLayer(selected.id, file);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  filename?: string;
  onApply: (file: File, dims: { width: number; height: number }, maintainBounds: boolean) => Promise<void>;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

function ImageCropDialog({
  open,
  onOpenChange,
  src,
  filename,
  onApply,
}: ImageCropDialogProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 10,
    y: 10,
    w: 80,
    h: 80,
  });
  const [applying, setApplying] = useState(false);
  const [drag, setDrag] = useState<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [maintainBounds, setMaintainBounds] = useState(true);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 10, y: 10, w: 80, h: 80 });
  }, [open, src]);

  useEffect(() => {
    if (!drag) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
      const minSize = 5;
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

      setCrop(() => {
        const base = drag.startCrop;
        let x = base.x;
        let y = base.y;
        let w = base.w;
        let h = base.h;

        if (drag.mode === 'move') {
          x = clamp(base.x + dxPct, 0, 100 - base.w);
          y = clamp(base.y + dyPct, 0, 100 - base.h);
        } else if (drag.mode === 'se') {
          w = clamp(base.w + dxPct, minSize, 100 - base.x);
          h = clamp(base.h + dyPct, minSize, 100 - base.y);
        } else if (drag.mode === 'sw') {
          const newX = clamp(base.x + dxPct, 0, base.x + base.w - minSize);
          w = clamp(base.w + (base.x - newX), minSize, 100 - newX);
          x = newX;
          h = clamp(base.h + dyPct, minSize, 100 - base.y);
        } else if (drag.mode === 'ne') {
          const newY = clamp(base.y + dyPct, 0, base.y + base.h - minSize);
          h = clamp(base.h + (base.y - newY), minSize, 100 - newY);
          y = newY;
          w = clamp(base.w + dxPct, minSize, 100 - base.x);
        } else if (drag.mode === 'nw') {
          const newX = clamp(base.x + dxPct, 0, base.x + base.w - minSize);
          const newY = clamp(base.y + dyPct, 0, base.y + base.h - minSize);
          w = clamp(base.w + (base.x - newX), minSize, 100 - newX);
          h = clamp(base.h + (base.y - newY), minSize, 100 - newY);
          x = newX;
          y = newY;
        }

        x = clamp(x, 0, 100 - w);
        y = clamp(y, 0, 100 - h);
        return { x, y, w, h };
      });
    };

    const handleUp = () => {
      setDrag(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [drag]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    const w = target.naturalWidth || 0;
    const h = target.naturalHeight || 0;
    if (!w || !h) return;
    setNaturalSize({ width: w, height: h });
  };

  const updateCrop = (patch: Partial<{ x: number; y: number; w: number; h: number }>) => {
    setCrop((prev) => {
      const next = { ...prev, ...patch };
      let x = Math.max(0, Math.min(100, next.x));
      let y = Math.max(0, Math.min(100, next.y));
      let w = Math.max(5, Math.min(100, next.w));
      let h = Math.max(5, Math.min(100, next.h));
      if (x + w > 100) {
        if (patch.w !== undefined && patch.x === undefined) {
          w = 100 - x;
        } else {
          x = 100 - w;
        }
      }
      if (y + h > 100) {
        if (patch.h !== undefined && patch.y === undefined) {
          h = 100 - y;
        } else {
          y = 100 - h;
        }
      }
      return { x, y, w, h };
    });
  };

  const startDrag = (mode: DragMode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    });
  };

  const handleApply = async () => {
    if (!naturalSize) return;
    const img = imgRef.current;
    if (!img) return;
    const cropX = Math.round((crop.x / 100) * naturalSize.width);
    const cropY = Math.round((crop.y / 100) * naturalSize.height);
    const cropW = Math.round((crop.w / 100) * naturalSize.width);
    const cropH = Math.round((crop.h / 100) * naturalSize.height);
    if (cropW <= 0 || cropH <= 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    let mime = "image/png";
    const m = /^data:(image\/[a-zA-Z0-9.+-]+);/.exec(src);
    if (m && m[1]) {
      mime = m[1];
    }
    setApplying(true);
    try {
      const file = await new Promise<File>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create cropped image"));
              return;
            }
            const name = filename || "cropped-image.png";
            const file = new File([blob], name, { type: mime });
            resolve(file);
          },
          mime,
          mime === "image/jpeg" ? 0.9 : undefined,
        );
      });
      await onApply(file, { width: cropW, height: cropH }, maintainBounds);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  const cropWidthPx =
    naturalSize ? Math.round((crop.w / 100) * naturalSize.width) : null;
  const cropHeightPx =
    naturalSize ? Math.round((crop.h / 100) * naturalSize.height) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
          <DialogDescription>
            Adjust the crop area and apply to replace the current image.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-center overflow-hidden rounded-md border bg-muted p-4">
            <div ref={containerRef} className="relative w-fit">
              <img
                ref={imgRef}
                src={src}
                alt=""
                className="block max-h-[50vh] max-w-full object-contain"
                onLoad={onImageLoad}
                draggable={false}
              />
              {naturalSize && (
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="absolute border-2 border-green-500 bg-black/20 pointer-events-none"
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.w}%`,
                      height: `${crop.h}%`,
                    }}
                  >
                    <div
                      className="absolute inset-0 cursor-move pointer-events-auto"
                      onMouseDown={(e) => startDrag('move', e)}
                    />
                    <div
                      className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-green-500 border border-white cursor-nwse-resize pointer-events-auto"
                      onMouseDown={(e) => startDrag('nw', e)}
                    />
                    <div
                      className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-green-500 border border-white cursor-nesw-resize pointer-events-auto"
                      onMouseDown={(e) => startDrag('ne', e)}
                    />
                    <div
                      className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-green-500 border border-white cursor-nesw-resize pointer-events-auto"
                      onMouseDown={(e) => startDrag('sw', e)}
                    />
                    <div
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-green-500 border border-white cursor-nwse-resize pointer-events-auto"
                      onMouseDown={(e) => startDrag('se', e)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Switch
                checked={maintainBounds}
                onCheckedChange={setMaintainBounds}
              />
              <span>Maintain bounds after crop</span>
            </div>
            {cropWidthPx !== null && cropHeightPx !== null && (
              <div>
                Crop size: {cropWidthPx} x {cropHeightPx}px
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!naturalSize || applying}
            >
              {applying ? "Cropping..." : "Apply crop"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
