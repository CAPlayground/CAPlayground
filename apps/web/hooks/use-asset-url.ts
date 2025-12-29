import { useEffect, useState } from "react";
import { getFile } from "@/lib/storage";
import { useEditor } from "@/components/editor/editor-context";
import { CAEmitterCell } from "@/components/editor/emitter/emitter";

class AssetCache {
  private cache = new Map<string, string>();
  private accessOrder: string[] = [];

  get(id: string): string | null {
    const data = this.cache.get(id);
    if (data) {
      this.accessOrder = this.accessOrder.filter((k) => k !== id);
      this.accessOrder.push(id);
    }
    return data || null;
  }

  set(id: string, url: string) {
    this.cache.set(id, url);
    this.accessOrder = this.accessOrder.filter((k) => k !== id);
    this.accessOrder.push(id);
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  clear() {
    this.cache.forEach((url) => URL.revokeObjectURL(url));
    this.cache.clear();
    this.accessOrder = [];
  }
}

export const assetCache = new AssetCache();

function buildAssetPaths(projectName: string, assetSrc: string): string[] {
  return [
    `${projectName}.ca/Floating.ca/${assetSrc}`,
    `${projectName}.ca/Background.ca/${assetSrc}`,
    `${projectName}.ca/Wallpaper.ca/${assetSrc}`,
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
  const [src, setSrc] = useState<string | null>(() => assetCache.get(cacheKey));
  const [loading, setLoading] = useState(!assetCache.has(cacheKey) && !skip);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (skip || !assetSrc) {
      setLoading(false);
      return;
    }

    const cached = assetCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAsset() {
      setLoading(true);
      setError(null);

      try {
        const paths = buildAssetPaths(projectName, assetSrc!);
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
      if (url) cached.set(i, url);
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

        const cached = assetCache.get(frameAssetId);
        if (cached) {
          loadedFrames.set(i, cached);
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
  cellImages: Map<string, HTMLImageElement>;
  loading: boolean;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export function useEmitterCellImages({
  cells,
  skip = false,
}: UseEmitterCellImagesOptions): UseEmitterCellImagesResult {
  const { doc } = useEditor();
  const projectId = doc?.meta.id ?? "";
  const projectName = doc?.meta.name ?? "";

  const [cellImages, setCellImages] = useState<Map<string, HTMLImageElement>>(
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
      const loadedImages = new Map<string, HTMLImageElement>();

      for (const cell of cells) {
        if (cancelled) return;

        const cached = assetCache.get(cell.id);
        if (cached) {
          try {
            const img = await loadImage(cached);
            loadedImages.set(cell.id, img);
          } catch (err) {
            console.error(`Failed to load cached image for cell ${cell.id}:`, err);
          }
          continue;
        }

        if (cell.src) {
          try {
            const paths = [
              `${projectName}.ca/Floating.ca/${cell.src}`,
              `${projectName}.ca/Background.ca/${cell.src}`,
              `${projectName}.ca/Wallpaper.ca/${cell.src}`,
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
              const img = await loadImage(url);
              loadedImages.set(cell.id, img);
              assetCache.set(cell.id, url);
            }
          } catch (err) {
            console.error(`Failed to load cell image ${cell.id}:`, err);
          }
        }
      }

      if (!cancelled) {
        setCellImages(loadedImages);
        setLoading(false);
      }
    }

    loadAllCellImages();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(cells.map((c) => ({ id: c.id, src: c.src }))), projectId, projectName, skip]);

  return { cellImages, loading };
}

