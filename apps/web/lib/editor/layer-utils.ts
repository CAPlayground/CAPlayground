import type { AnyLayer, GroupLayer, ShapeLayer } from "@/lib/ca/types";

export const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function findById(layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined {
  if (!id) return undefined;
  for (const l of layers) {
    if (l.id === id) return l;
    if ((l as any).type === 'group' || (l as any).type === 'replicator') {
      const g = l as any;
      const found = findById(g.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function insertIntoGroupInTree(
  layers: AnyLayer[],
  groupId: string,
  node: AnyLayer,
  index?: number
): { inserted: boolean; layers: AnyLayer[] } {
  let inserted = false;
  const next: AnyLayer[] = [];
  for (const l of layers) {
    if (l.id === groupId && ((l as any).type === 'group' || (l as any).type === 'replicator')) {
      const g: any = l as any;
      let kids = [...(g.children as AnyLayer[])];
      const i = typeof index === 'number' && index >= 0 && index <= kids.length ? index : kids.length;
      kids.splice(i, 0, node);
      const disp = (g as any)._displayType as string | undefined;
      if (disp === 'text' && (node as any).type !== 'text') {
        kids = kids.filter((c) => (c as any).type !== 'text');
      }
      if (disp === 'image' && (node as any).type !== 'image') {
        kids = kids.filter((c) => (c as any).type !== 'image');
      }
      if (disp === 'gradient' && (node as any).type !== 'gradient') {
        kids = kids.filter((c) => (c as any).type !== 'gradient');
      }
      next.push({ ...g, children: kids } as AnyLayer);
      inserted = true;
    } else if ((l as any).type === 'group' || (l as any).type === 'replicator') {
      const g: any = l as any;
      const res = insertIntoGroupInTree(g.children, groupId, node, index);
      if (res.inserted) {
        inserted = true;
        next.push({ ...g, children: res.layers } as AnyLayer);
      } else {
        next.push(l);
      }
    } else {
      next.push(l);
    }
  }
  return { inserted, layers: next };
}

export function cloneLayerDeep(layer: AnyLayer): AnyLayer {
  const newId = genId();
  if ((layer as any).type === 'replicator') {
    const r = layer as any;
    return {
      ...JSON.parse(JSON.stringify({ ...r, id: newId })) as any,
      id: newId,
      children: (r.children || []).map(cloneLayerDeep),
      position: { x: (r.position?.x ?? 0) + 10, y: (r.position?.y ?? 0) + 10 },
      name: `${r.name} copy`,
    } as AnyLayer;
  }
  if (layer.type === 'group') {
    const g = layer as GroupLayer;
    return {
      ...JSON.parse(JSON.stringify({ ...g, id: newId })) as GroupLayer,
      id: newId,
      children: g.children.map(cloneLayerDeep),
      position: { x: (g.position?.x ?? 0) + 10, y: (g.position?.y ?? 0) + 10 },
      name: `${g.name} copy`,
    } as AnyLayer;
  }
  const base = JSON.parse(JSON.stringify({ ...layer })) as AnyLayer;
  (base as any).id = newId;
  (base as any).name = `${layer.name} copy`;
  (base as any).position = { x: (layer as any).position?.x + 10, y: (layer as any).position?.y + 10 };
  return base;
}

export function updateInTree(layers: AnyLayer[], id: string, patch: Partial<AnyLayer>): AnyLayer[] {
  return layers.map((l) => {
    if (l.id === id) return { ...l, ...patch } as AnyLayer;
    if ((l as any).type === "group" || (l as any).type === 'replicator') {
      const g: any = l as any;
      return { ...g, children: updateInTree(g.children, id, patch) } as AnyLayer;
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
    if ((l as any).type === 'group' || (l as any).type === 'replicator') {
      const g: any = l as any;
      const res = removeFromTree(g.children, id);
      if (res.removed) removed = res.removed;
      next.push({ ...g, children: res.layers } as AnyLayer);
    } else {
      next.push(l);
    }
  }
  return { removed, layers: next };
}

export function insertBeforeInTree(layers: AnyLayer[], targetId: string, node: AnyLayer): { inserted: boolean; layers: AnyLayer[] } {
  let inserted = false;
  const next: AnyLayer[] = [];
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (!inserted && l.id === targetId) {
      next.push(node);
      next.push(l);
      inserted = true;
    } else if ((l as any).type === 'group' || (l as any).type === 'replicator') {
      const g: any = l as any;
      const res = insertBeforeInTree(g.children, targetId, node);
      if (res.inserted) {
        inserted = true;
        next.push({ ...g, children: res.layers } as AnyLayer);
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
    if ((l as any).type === "group" || (l as any).type === 'replicator') {
      const g: any = l as any;
      next.push({ ...g, children: deleteInTree(g.children, id) } as AnyLayer);
    } else {
      next.push(l);
    }
  }
  return next;
}

export function containsId(layers: AnyLayer[], id: string): boolean {
  for (const l of layers) {
    if (l.id === id) return true;
    if (((l as any).type === "group" || (l as any).type === 'replicator') && containsId(((l as any).children as AnyLayer[]), id)) return true;
  }
  return false;
}

export function wrapAsGroup(
  layers: AnyLayer[],
  targetId: string,
): { layers: AnyLayer[]; newGroupId: string | null } {
  let newGroupId: string | null = null;

  const wrapNode = (l: AnyLayer): AnyLayer => {
    if (l.id !== targetId) {
      if (l.type === 'group') {
        const g = l as GroupLayer;
        return { ...g, children: g.children.map(wrapNode) } as AnyLayer;
      }
      if ((l as any).type === 'replicator') {
        const r: any = l as any;
        return { ...r, children: ((r.children || []) as AnyLayer[]).map(wrapNode) } as AnyLayer;
      }
      return l;
    }

    if (l.type === 'group') {
      newGroupId = l.id;
      return l;
    }
    if ((l as any).type === 'replicator') {
      newGroupId = (l as any).id;
      return l;
    }
    if (l.type === 'shape') {
      const s = l as ShapeLayer;
      const container: GroupLayer = {
        id: s.id,
        name: s.name,
        type: 'group',
        position: { ...s.position },
        size: { ...s.size },
        anchorPoint: (s as any).anchorPoint,
        opacity: (s as any).opacity,
        rotation: (s as any).rotation,
        rotationX: (s as any).rotationX,
        rotationY: (s as any).rotationY,
        geometryFlipped: (s as any).geometryFlipped,
        backgroundColor: (s as any).fill ?? (s as any).backgroundColor,
        borderColor: (s as any).stroke ?? (s as any).borderColor,
        borderWidth: (s as any).strokeWidth ?? (s as any).borderWidth,
        cornerRadius: (s as any).radius ?? (s as any).cornerRadius,
        children: [],
      } as any;
      (container as any)._displayType = 'shape';
      newGroupId = container.id;
      return container as AnyLayer;
    }

    if ((l as any).type === 'video') {
      const groupId = genId();
      newGroupId = groupId;
      const container: GroupLayer = {
        id: groupId,
        name: l.name,
        type: 'group',
        position: { ...l.position },
        size: { ...l.size },
        anchorPoint: (l as any).anchorPoint,
        opacity: (l as any).opacity,
        rotation: (l as any).rotation,
        rotationX: (l as any).rotationX,
        rotationY: (l as any).rotationY,
        geometryFlipped: (l as any).geometryFlipped,
        children: [],
      } as any;
      (container as any)._displayType = 'video';

      const child = JSON.parse(JSON.stringify(l)) as AnyLayer;
      (child as any).__wrappedContent = true;
      (child as any).rotation = 0;
      (child as any).rotationX = undefined;
      (child as any).rotationY = undefined;
      const a = (child as any).anchorPoint;
      if (!a || Math.abs(a.x - 0.5) > 1e-6 || Math.abs(a.y - 0.5) > 1e-6) {
        (child as any).anchorPoint = { x: 0.5, y: 0.5 };
      }
      (child as any).position = { x: container.size.w / 2, y: container.size.h / 2 };
      container.children = [child];
      return container as AnyLayer;
    }

    if ((l as any).type === 'image') {
      const img = l as any;
      const container: GroupLayer = {
        id: img.id,
        name: img.name,
        type: 'group',
        position: { ...img.position },
        size: { ...img.size },
        anchorPoint: (img as any).anchorPoint,
        opacity: (img as any).opacity,
        rotation: (img as any).rotation,
        rotationX: (img as any).rotationX,
        rotationY: (img as any).rotationY,
        geometryFlipped: (img as any).geometryFlipped,
        children: [],
      } as any;
      (container as any)._displayType = 'image';
      (container as any).src = img.src;
      (container as any).fit = img.fit;
      newGroupId = container.id;
      return container as AnyLayer;
    }

    if ((l as any).type === 'text') {
      const t = l as any;
      const container: GroupLayer = {
        id: t.id,
        name: t.name,
        type: 'group',
        position: { ...t.position },
        size: { ...t.size },
        anchorPoint: (t as any).anchorPoint,
        opacity: (t as any).opacity,
        rotation: (t as any).rotation,
        rotationX: (t as any).rotationX,
        rotationY: (t as any).rotationY,
        geometryFlipped: (t as any).geometryFlipped,
        children: [],
      } as any;
      (container as any)._displayType = 'text';
      (container as any).text = t.text;
      (container as any).fontFamily = t.fontFamily;
      (container as any).fontSize = t.fontSize;
      (container as any).color = t.color;
      (container as any).align = t.align;
      (container as any).wrapped = t.wrapped;
      newGroupId = container.id;
      return container as AnyLayer;
    }

    if ((l as any).type === 'gradient') {
      const gr = l as any;
      const container: GroupLayer = {
        id: gr.id,
        name: gr.name,
        type: 'group',
        position: { ...gr.position },
        size: { ...gr.size },
        anchorPoint: (gr as any).anchorPoint,
        opacity: (gr as any).opacity,
        rotation: (gr as any).rotation,
        rotationX: (gr as any).rotationX,
        rotationY: (gr as any).rotationY,
        geometryFlipped: (gr as any).geometryFlipped,
        children: [],
      } as any;
      (container as any)._displayType = 'gradient';
      (container as any).gradientType = gr.gradientType;
      (container as any).startPoint = gr.startPoint;
      (container as any).endPoint = gr.endPoint;
      (container as any).colors = gr.colors;
      newGroupId = container.id;
      return container as AnyLayer;
    }

    const old = l as AnyLayer;
    const container: GroupLayer = {
      id: old.id,
      name: old.name,
      type: 'group',
      position: { ...old.position },
      size: { ...old.size },
      anchorPoint: (old as any).anchorPoint,
      opacity: (old as any).opacity,
      rotation: (old as any).rotation,
      rotationX: (old as any).rotationX,
      rotationY: (old as any).rotationY,
      geometryFlipped: (old as any).geometryFlipped,
      children: [],
    } as any;
    (container as any)._displayType = (old as any).type;
    const child = JSON.parse(JSON.stringify(old)) as AnyLayer;
    (child as any).__wrappedContent = true;
    (child as any).id = genId();
    (child as any).rotation = 0;
    (child as any).rotationX = undefined;
    (child as any).rotationY = undefined;
    const a = (child as any).anchorPoint;
    if (!a || Math.abs(a.x - 0.5) > 1e-6 || Math.abs(a.y - 0.5) > 1e-6) {
      (child as any).anchorPoint = { x: 0.5, y: 0.5 };
    }
    (child as any).position = { x: container.size.w / 2, y: container.size.h / 2 };
    container.children = [child];
    newGroupId = container.id;
    return container as AnyLayer;
  };

  const next = layers.map(wrapNode);
  return { layers: next, newGroupId };
}
