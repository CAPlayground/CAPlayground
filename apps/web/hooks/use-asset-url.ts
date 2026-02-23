import { useEffect, useState, useRef } from "react";
import { getFile } from "@/lib/storage";
import { useEditor } from "@/components/editor/editor-context";
import { CAEmitterCell } from "@/components/editor/emitter/emitter";

class AssetCache {
  private cache = new Map<string, string | ImageBitmap>();
  private cacheTint = new Map<string, HTMLCanvasElement>();
  private accessOrder: string[] = [];

  get(id: string): string | HTMLCanvasElement | ImageBitmap | null {
    const data = this.cache.get(id) || this.cacheTint.get(id);
    if (data) {
      this.accessOrder = this.accessOrder.filter((k) => k !== id);
      this.accessOrder.push(id);
    }
    return data || null;
  }
  
  set(id: string, value: string | HTMLCanvasElement | ImageBitmap) {
    if (value instanceof HTMLCanvasElement) {
      this.cacheTint.set(id, value);
    } else {
      this.cache.set(id, value);
    }
    this.accessOrder = this.accessOrder.filter((k) => k !== id);
    this.accessOrder.push(id);
  }

  has(id: string): boolean {
    return this.cache.has(id) || this.cacheTint.has(id);
  }

  clear() {
    this.cache.forEach((url) => typeof url === 'string' && URL.revokeObjectURL(url));
    this.cache.clear();
    this.cacheTint.clear();
    this.accessOrder = [];
  }
}

export const assetCache = new AssetCache();

function buildAssetPaths(projectName: string, name: string): string[] {
  return [
    `${projectName}.ca/Floating.ca/assets/${name}`,
    `${projectName}.ca/Background.ca/assets/${name}`,
    `${projectName}.ca/Wallpaper.ca/assets/${name}`,
  ];
}

interface UseAssetUrlOptions {
  cacheKey: string;
  assetSrc?: string;
  skip?: boolean;
}

interface UseAssetUrlResult {
  src: string | null;
  loading: boolean;
  error: Error | null;
}

export function useAssetUrl({
  cacheKey,
  assetSrc,
  skip = false,
}: UseAssetUrlOptions): UseAssetUrlResult {
  const { doc } = useEditor();
  const projectId = doc?.meta.id ?? "";
  const projectName = doc?.meta.name ?? "";
  const [src, setSrc] = useState<string | null>(() => assetCache.get(cacheKey) as string | null);
  const [loading, setLoading] = useState(!assetCache.has(cacheKey) && !skip);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (skip || !assetSrc) {
      setLoading(false);
      return;
    }

    const cached = assetCache.get(cacheKey) as string;
    if (cached) {
      setSrc(cached as string);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAsset() {
      setLoading(true);
      setError(null);

      try {
        const name = assetSrc?.split("/").pop() || "";
        const nameNorm = decodeURIComponent(name);
        const paths = buildAssetPaths(projectName, nameNorm);
        let buf: ArrayBuffer | undefined;
        for (const path of paths) {
          const file = await getFile(projectId, path);
          if (file?.data && file.data instanceof ArrayBuffer) {
            buf = file.data;
            break;
          }
        }

        if (cancelled) return;

        if (!buf) {
          setLoading(false);
          return;
        }

        const blob = new Blob([buf]);
        const url = URL.createObjectURL(blob);

        assetCache.set(cacheKey, url);
        setSrc(url);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAsset();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, projectId, projectName, assetSrc, skip]);

  return { src, loading, error };
}

interface UseVideoFramesOptions {
  videoId: string;
  frameCount: number;
  framePrefix: string;
  frameExtension: string;
  skip?: boolean;
}

interface UseVideoFramesResult {
  frames: Map<number, string>;
  loading: boolean;
}

export function useVideoFrames({
  videoId,
  frameCount,
  framePrefix,
  frameExtension,
  skip = false,
}: UseVideoFramesOptions): UseVideoFramesResult {
  const { doc } = useEditor();
  const projectId = doc?.meta.id ?? "";
  const projectName = doc?.meta.name ?? "";
  const [frames, setFrames] = useState<Map<number, string>>(() => {
    const cached = new Map<number, string>();
    for (let i = 0; i < frameCount; i++) {
      const url = assetCache.get(`${videoId}_frame_${i}`);
      if (url) cached.set(i, url as string);
    }
    return cached;
  });
  const [loading, setLoading] = useState(!skip && frames.size < frameCount);

  useEffect(() => {
    if (skip || frameCount <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAllFrames() {
      setLoading(true);
      const loadedFrames = new Map<number, string>();

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;

        const frameAssetId = `${videoId}_frame_${i}`;
        const frameName = `${framePrefix}${i}${frameExtension}`;

        const cached = assetCache.get(frameAssetId) as string;
        if (cached) {
          loadedFrames.set(i, cached as string);
          continue;
        }

        try {
          const paths = [
            `${projectName}.ca/Floating.ca/assets/${frameName}`,
            `${projectName}.ca/Background.ca/assets/${frameName}`,
            `${projectName}.ca/Wallpaper.ca/assets/${frameName}`,
          ];

          let buf: ArrayBuffer | undefined;
          for (const path of paths) {
            const file = await getFile(projectId, path);
            if (file?.data && file.data instanceof ArrayBuffer) {
              buf = file.data;
              break;
            }
          }

          if (buf) {
            const blob = new Blob([buf]);
            const url = URL.createObjectURL(blob);
            loadedFrames.set(i, url);
            assetCache.set(frameAssetId, url);
          }
        } catch (err) {
          console.error(`Failed to load frame ${i}:`, err);
        }
      }

      if (!cancelled) {
        setFrames(loadedFrames);
        setLoading(false);
      }
    }

    loadAllFrames();

    return () => {
      cancelled = true;
    };
  }, [videoId, frameCount, framePrefix, frameExtension, projectId, projectName, skip]);

  return { frames, loading };
}

interface UseEmitterCellImagesOptions {
  cells: CAEmitterCell[];
  skip?: boolean;
}

interface UseEmitterCellImagesResult {
  cellImages: Map<string, ImageBitmap>;
  loading: boolean;
}

export function useEmitterCellImages({
  cells,
  skip = false,
}: UseEmitterCellImagesOptions): UseEmitterCellImagesResult {
  const { doc } = useEditor();
  const projectId = doc?.meta.id ?? "";
  const projectName = doc?.meta.name ?? "";
  const bitmapsRef = useRef<Map<string, ImageBitmap>>(new Map());
  const [cellImages, setCellImages] = useState<Map<string, ImageBitmap>>(
    () => new Map()
  );
  const [loading, setLoading] = useState(!skip && cells.length > 0);

  useEffect(() => {
    if (skip || cells.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAllCellImages() {
      setLoading(true);
      const loadedImages = new Map<string, ImageBitmap>();

      for (const cell of cells) {
        if (cancelled) return;

        const cached = assetCache.get(cell.id) as unknown as ImageBitmap;
        if (cached) {
          try {
            loadedImages.set(cell.id, cached);
          } catch (err) {
            console.error(`Failed to load cached image for cell ${cell.id}:`, err);
          }
          continue;
        }

        if (cell.src) {
          try {
            const name = cell.src.split("/").pop() || "";
            const paths = buildAssetPaths(projectName, name);

            let buf: ArrayBuffer | undefined;
            for (const path of paths) {
              try {
                const file = await getFile(projectId, path);
                if (file?.data && file.data instanceof ArrayBuffer) {
                  buf = file.data;
                  break;
                }
              } catch {
                continue;
              }
            }

            if (buf) {
              const blob = new Blob([buf]);
              const bitmap = await createImageBitmap(blob);
              assetCache.set(cell.id, bitmap);
              loadedImages.set(cell.id, bitmap);
            }
          } catch (err) {
            console.error(`Failed to load cell image ${cell.id}:`, err);
          }
        }
      }

      if (!cancelled) {
        setCellImages(loadedImages);
        setLoading(false);
      } else {
        loadedImages.forEach((b) => b.close());
      }
    }

    loadAllCellImages();

    return () => {
      cancelled = true;
      bitmapsRef.current.forEach((b) => b.close());
      bitmapsRef.current = new Map();
    };
  }, [JSON.stringify(cells.map((c) => ({ id: c.id, src: c.src }))), projectId, projectName, skip]);

  return { cellImages, loading };
}

export function getTintedSprite(
  img: HTMLImageElement,
  tint: { r: number; g: number; b: number }
) {
  if (tint.r === 1 && tint.g === 1 && tint.b === 1) return img;
  const qr = Math.round(tint.r * 20) / 20;
  const qg = Math.round(tint.g * 20) / 20;
  const qb = Math.round(tint.b * 20) / 20;
  const key = `${img.src}|${qr},${qg},${qb}`;
  
  if (assetCache.has(key)) return assetCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width || 1;
  canvas.height = img.naturalHeight || img.height || 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgb(${Math.floor(qr * 255)},${Math.floor(qg * 255)},${Math.floor(qb * 255)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(img, 0, 0);

  assetCache.set(key, canvas);
  
  return canvas;
}