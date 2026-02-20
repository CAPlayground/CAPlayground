import type { AnyLayer } from "@/lib/ca/types";
import { clamp } from "../utils";

export const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function findById(layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined {
  if (!id) return undefined;
  for (const l of layers) {
    if (l.id === id) return l;
    if (l.children?.length) {
      const found = findById(l.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function insertIntoSelected(layers: AnyLayer[], selId: string | null, node: AnyLayer): AnyLayer[] {
  if (!selId || selId === '__root__') {
    return [...layers, node];
  } else {
    const target = findById(layers, selId);
    if (target) {
      return insertLayerInTree(layers, selId, node);
    } else {
      return [...layers, node];
    }
  }
}

const insertLayerInTree = (layers: AnyLayer[], selId: string | null, node: AnyLayer): AnyLayer[] => {
  return layers.map((l) => {
    if (l.id === selId) {
      const newChildren = l.children?.slice() || [];
      newChildren.push(node);
      return { ...l, children: newChildren }
    }
    if (!l.children || l.children.length === 0) {
      return l;
    }
    return {
      ...l,
      children: insertLayerInTree(l.children, selId, node)
    };
  });
}

export function cloneLayerDeep(layer: AnyLayer, existingLayers?: AnyLayer[]): AnyLayer {
  const createdLayers: AnyLayer[] = [];

  const cloneRecursive = (node: AnyLayer): AnyLayer => {
    const newId = genId();

    const allExisting = existingLayers ? [...existingLayers, ...createdLayers] : [];
    const newName = existingLayers
      ? getNextLayerName(allExisting, node.name)
      : `${node.name} copy`;

    if (node.children?.length) {
      const cloned = {
        ...JSON.parse(JSON.stringify({ ...node, id: newId })),
        id: newId,
        children: node.children.map(cloneRecursive),
        position: { x: (node.position?.x ?? 0), y: (node.position?.y ?? 0) },
        name: newName,
      } as AnyLayer;
      createdLayers.push(cloned);
      return cloned;
    }

    const base = JSON.parse(JSON.stringify({ ...node })) as AnyLayer;
    base.id = newId;
    base.name = newName;
    base.position = { x: node.position?.x, y: node.position?.y };
    createdLayers.push(base);
    return base;
  };

  return cloneRecursive(layer);
}

export function updateInTree(layers: AnyLayer[], id: string, patch: Partial<AnyLayer>): AnyLayer[] {
  return layers.map((l) => {
    if (l.id === id) {
      if (l.type === 'video') {
        if (patch.size && l.children?.length) {
          const newChildren = l.children?.map((c) => {
            const newPosition = {
              x: (patch.size?.w ?? l.size.w) / 2,
              y: (patch.size?.h ?? l.size.h) / 2
            };
            return {
              ...c,
              ...patch,
              position: newPosition
            } as AnyLayer;
          }) || [];
          return { ...l, ...patch, children: newChildren } as AnyLayer;
        }
      }
      return { ...l, ...patch } as AnyLayer;
    }
    if (l.children?.length) {
      return { ...l, children: updateInTree(l.children, id, patch) } as AnyLayer;
    }
    return l;
  });
}

export function removeFromTree(layers: AnyLayer[], id: string): { removed: AnyLayer | null; layers: AnyLayer[] } {
  let removed: AnyLayer | null = null;
  const next: AnyLayer[] = [];
  for (const l of layers) {
    if (l.id === id) {
      removed = l;
      continue;
    }
    if (l.children?.length) {
      const res = removeFromTree(l.children, id);
      if (res.removed) removed = res.removed;
      next.push({ ...l, children: res.layers } as AnyLayer);
    } else {
      next.push(l);
    }
  }
  return { removed, layers: next };
}

export function insertInTree(
  layers: AnyLayer[],
  targetId: string,
  node: AnyLayer,
  position: 'before' | 'after' | 'into' = 'before'
): { inserted: boolean; layers: AnyLayer[] } {
  let inserted = false;
  const next: AnyLayer[] = [];
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (!inserted && l.id === targetId) {
      if (position === 'before') next.push(node);
      next.push(l);
      if (position === 'after') next.push(node);
      inserted = true;
    } else if (l.children?.length) {
      const res = insertInTree(l.children, targetId, node, position);
      if (res.inserted) {
        inserted = true;
        next.push({ ...l, children: res.layers } as AnyLayer);
      } else {
        next.push(l);
      }
    } else {
      next.push(l);
    }
  }
  return { inserted, layers: next };
}

export function deleteInTree(layers: AnyLayer[], id: string): AnyLayer[] {
  const next: AnyLayer[] = [];
  for (const l of layers) {
    if (l.id === id) continue;
    if (l.children?.length) {
      next.push({ ...l, children: deleteInTree(l.children, id) } as AnyLayer);
    } else {
      next.push(l);
    }
  }
  return next;
}

export function containsId(layers: AnyLayer[], id: string): boolean {
  for (const l of layers) {
    if (l.id === id) return true;
    if (l.children?.length && containsId(l.children, id)) return true;
  }
  return false;
}

export function getNextLayerName(layers: AnyLayer[], base: string = 'Layer') {
  function collectNames(list: AnyLayer[], acc: string[] = []) {
    for (const layer of list) {
      if (layer.name) acc.push(layer.name);
      if (layer.children?.length) collectNames(layer.children, acc);
    }
    return acc;
  }

  const allNames = collectNames(layers);
  let i = 1;
  while (allNames.includes(`${base} ${i}`)) {
    i++;
  }

  return `${base} ${i}`;
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return [0, 0, 0];
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

export function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const bv = Math.round(lerp(b1, b2, t));
  return '#' + [r, g, bv].map(n => clamp(n, 0, 255).toString(16).padStart(2, '0')).join('');
}

export function interpolateLayers(baseLayers: AnyLayer[], targetLayers: AnyLayer[], progress: number): AnyLayer[] {
  const interpolate = (base: AnyLayer[], target: AnyLayer[], prog: number): AnyLayer[] => {
    return base.map((baseLayer, index) => {
      const targetLayer = target[index];
      if (!targetLayer) return baseLayer;

      const baseBg = baseLayer.backgroundColor;
      const targetBg = targetLayer.backgroundColor;
      const interpolatedBg =
        baseBg && targetBg && baseBg !== targetBg
          ? lerpColor(baseBg, targetBg, prog)
          : prog >= 1 ? targetBg : baseBg;

      return {
        ...baseLayer,
        position: {
          x: lerp(baseLayer.position?.x ?? 0, targetLayer.position?.x ?? 0, prog),
          y: lerp(baseLayer.position?.y ?? 0, targetLayer.position?.y ?? 0, prog),
        },
        size: baseLayer.size ? {
          w: lerp(baseLayer.size.w, targetLayer.size?.w ?? baseLayer.size.w, prog),
          h: lerp(baseLayer.size.h, targetLayer.size?.h ?? baseLayer.size.h, prog),
        } : baseLayer.size,
        rotation: lerp(baseLayer.rotation ?? 0, targetLayer.rotation ?? 0, prog),
        rotationX: lerp(baseLayer.rotationX ?? 0, targetLayer.rotationX ?? 0, prog),
        rotationY: lerp(baseLayer.rotationY ?? 0, targetLayer.rotationY ?? 0, prog),
        opacity: lerp(baseLayer.opacity ?? 1, targetLayer.opacity ?? 1, prog),
        zPosition: lerp(baseLayer.zPosition ?? 0, targetLayer.zPosition ?? 0, prog),
        ...(interpolatedBg !== undefined ? { backgroundColor: interpolatedBg } : {}),
        children: baseLayer.children && targetLayer.children
          ? interpolate(baseLayer.children, targetLayer.children, prog)
          : baseLayer.children,
      };
    });
  };
  return interpolate(baseLayers, targetLayers, progress);
}

export const hasLayerAnimations = (layer: AnyLayer): boolean => {
  const animations = (layer.animations ?? []).filter((a) => a.enabled !== false);
  if (animations.length > 0) return true;
  return (layer.children ?? []).some((child) => hasLayerAnimations(child));
};
