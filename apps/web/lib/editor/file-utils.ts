import { putBlobFilesBatch, listFiles, deleteFile } from "@/lib/storage";
import type { AnyLayer, ImageLayer, VideoLayer, EmitterLayer } from "@/lib/ca/types";

export function sanitizeFilename(name: string): string {
  const n = (name || '').trim();
  if (!n) return '';
  const parts = n.split('.');
  const ext = parts.length > 1 ? parts.pop() as string : '';
  const base = parts.join('.') || 'image';
  let safeBase = base.replace(/[^a-z0-9\-_.]+/gi, '_');
  safeBase = safeBase.replace(/^-+/, '').replace(/-+$/, '');
  if (!safeBase) safeBase = 'image';
  const safeExt = (ext || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const [meta, data] = dataURL.split(',');
  const isBase64 = /;base64$/i.test(meta);
  const mimeMatch = meta.match(/^data:([^;]+)(;base64)?$/i);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  if (isBase64) {
    const byteString = atob(data);
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ia], { type: mime });
  } else {
    return new Blob([decodeURIComponent(data)], { type: mime });
  }
}

export const normalize = (s: string) => {
  try { s = decodeURIComponent(s); } catch {}
  return (s || '').trim().toLowerCase();
};

export interface FrameAsset {
  dataURL: string;
  filename: string;
}

export function collectReferencedAssets(layers: AnyLayer[]): Set<string> {
  const referenced = new Set<string>();

  const walk = (layerList: AnyLayer[]) => {
    for (const layer of layerList) {
      if (layer.type === "image") {
        const img = layer as ImageLayer;
        if (img.src) {
          const filename = img.src.split("/").pop();
          if (filename) referenced.add(normalize(filename));
        }
      }

      if (layer.type === "video") {
        const video = layer as VideoLayer;
        const frameCount = video.frameCount || 0;
        const prefix = video.framePrefix || "";
        const ext = video.frameExtension || "";
        for (let i = 0; i < frameCount; i++) {
          referenced.add(normalize(`${prefix}${i}${ext}`));
        }
      }

      if (layer.type === "emitter") {
        const emitter = layer as EmitterLayer;
        for (const cell of emitter.emitterCells || []) {
          if (cell.src) {
            const filename = cell.src.split("/").pop();
            if (filename) referenced.add(normalize(filename));
          }
        }
      }

      if (layer.children?.length) {
        walk(layer.children);
      }
    }
  };

  walk(layers);
  return referenced;
}

export async function cleanupOrphanedAssets(
  projectId: string,
  projectName: string,
  caFolder: "Floating.ca" | "Background.ca" | "Wallpaper.ca",
  layers: AnyLayer[]
): Promise<number> {
  const folder = `${projectName}.ca`;
  const assetsPrefix = `${folder}/${caFolder}/assets/`;

  const allFiles = await listFiles(projectId, assetsPrefix);
  if (!allFiles.length) return 0;

  const referenced = collectReferencedAssets(layers);
  let deletedCount = 0;
  for (const file of allFiles) {
    const filename = file.path.split("/assets/").pop();
    if (!filename) continue;

    const normalizedFilename = normalize(filename);
    if (!referenced.has(normalizedFilename)) {
      try {
        const assetPath = `${caFolder}/assets/${filename}`;
        await deleteFile(projectId, assetPath);
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete orphaned asset: ${file.path}`, err);
      }
    }
  }

  return deletedCount;
}

export async function uploadFrameAssets(
  projectId: string,
  folder: string,
  caFolder: string,
  frameAssets: FrameAsset[]
): Promise<boolean> {
  const assetFiles: Array<{ path: string; data: Blob }> = [];

  for (const frame of frameAssets) {
    try {
      const blob = await dataURLToBlob(frame.dataURL);
      const assetPath = `${folder}/${caFolder}/assets/${frame.filename}`;
      assetFiles.push({ path: assetPath, data: blob });
    } catch (err) {
      console.error("Failed to prepare asset:", frame.filename, err);
    }
  }

  try {
    await putBlobFilesBatch(projectId, assetFiles);
    return true;
  } catch (err) {
    console.error("Failed to write assets batch:", err);
    return false;
  }
}
