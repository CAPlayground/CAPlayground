import type { AnyLayer } from "@/lib/ca/types";

export type TabId =
  'geometry' |
  'compositing' |
  'content' |
  'text' |
  'gradient' |
  'image' |
  'video' |
  'emitter' |
  'replicator' |
  'animations' |
  'gyro' |
  'filters';

export interface InspectorTabProps {
  selected: AnyLayer;
  selectedBase: AnyLayer;
  updateLayer: (id: string, updates: Partial<AnyLayer>) => void;
  updateLayerTransient: (id: string, updates: Partial<AnyLayer>) => void;
  getBuf: (key: string, fallback: string) => string;
  setBuf: (key: string, val: string) => void;
  clearBuf: (key: string) => void;
  round2: (n: number) => number;
  fmt2: (n: number | undefined) => string;
  fmt0: (n: number | undefined) => string;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const fmt2 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? round2(n).toFixed(2) : "");
export const fmt0 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n).toString() : "");

export const findById = (layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined => {
  if (!id) return undefined;
  for (const l of layers) {
    if (l.id === id) return l;
    if (l.children?.length) {
      const found = findById(l.children, id);
      if (found) return found;
    }
  }
  return undefined;
};
