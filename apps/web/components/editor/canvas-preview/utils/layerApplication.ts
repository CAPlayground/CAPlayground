import { AnyLayer, TextLayer } from "@/lib/ca/types";

export const applyOverrides = (
  layers: AnyLayer[],
  overrides: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>> | undefined,
  state: string | undefined
): AnyLayer[] => {
  if (!overrides || !state || state === 'Base State') return layers;
  const map: Record<string, AnyLayer> = {};
  const cloneTree = (arr: AnyLayer[]): AnyLayer[] => arr.map((l) => {
    const copy = JSON.parse(JSON.stringify(l)) as AnyLayer;
    map[copy.id] = copy;
    if (copy.children?.length) {
      copy.children = cloneTree(copy.children);
    }
    return copy;
  });
  const rootCopy = cloneTree(layers);
  let list = overrides[state] || [];
  if ((!list || list.length === 0) && /\s(Light|Dark)$/.test(String(state))) {
    const base = String(state).replace(/\s(Light|Dark)$/, '');
    list = overrides[base] || [];
  }
  for (const o of list) {
    const target = map[o.targetId?.trim()] || map[o.targetId];
    if (!target) continue;
    const kp = (o.keyPath || '').toLowerCase();
    const v = o.value;
    if (kp === 'position.y' && typeof v === 'number') {
      target.position = { ...target.position, y: v };
    } else if (kp === 'position.x' && typeof v === 'number') {
      target.position = { ...target.position, x: v };
    } else if (kp === 'zposition' && typeof v === 'number') {
      target.zPosition = v;
    } else if (kp === 'bounds.size.width' && typeof v === 'number') {
      target.size = { ...target.size, w: v };
    } else if (kp === 'bounds.size.height' && typeof v === 'number') {
      target.size = { ...target.size, h: v };
    } else if ((kp === 'transform.rotation' || kp === 'transform.rotation.z') && typeof v === 'number') {
      target.rotation = v;
    } else if (kp === 'transform.rotation.x' && typeof v === 'number') {
      target.rotationX = v as number;
    } else if (kp === 'transform.rotation.y' && typeof v === 'number') {
      target.rotationY = v as number;
    } else if (kp === 'opacity' && typeof v === 'number') {
      target.opacity = v as any;
    } else if (kp === 'cornerradius' && typeof v === 'number') {
      target.cornerRadius = v as any;
    } else if (kp === 'borderwidth' && typeof v === 'number') {
      target.borderWidth = v as any;
    } else if (kp === 'fontsize' && typeof v === 'number') {
      (target as TextLayer).fontSize = v as any;
    } else if (kp === 'backgroundcolor' && typeof v === 'string') {
      target.backgroundColor = v as any;
    } else if (kp === 'bordercolor' && typeof v === 'string') {
      target.borderColor = v as any;
    } else if (kp === 'color' && typeof v === 'string') {
      (target as TextLayer).color = v as any;
    }
  }
  const baseState = state.replace(/\s(Light|Dark)$/,'') as 'Locked' | 'Unlock' | 'Sleep' | string;
  const applySyncVideoZ = (arr: AnyLayer[]) => {
    for (const l of arr) {
      if ((l as any).type === 'video' && (l as any).syncWWithState && Array.isArray((l as any).children)) {
        const video: any = l;
        const frameCount: number = typeof video.frameCount === 'number' && video.frameCount > 0
          ? video.frameCount
          : (video.children as AnyLayer[]).length;
        if (!frameCount) {
        } else {
          const modeCfg = (video.syncStateFrameMode as { Locked?: 'beginning' | 'end'; Unlock?: 'beginning' | 'end'; Sleep?: 'beginning' | 'end' } | undefined) || {};
          const resolveMode = (st: 'Locked' | 'Unlock' | 'Sleep'): 'beginning' | 'end' => {
            const v = modeCfg[st];
            if (v === 'beginning' || v === 'end') return v;
            if (st === 'Locked') return 'beginning';
            if (st === 'Unlock') return 'end';
            return 'end';
          };
          const base: 'Locked' | 'Unlock' | 'Sleep' | null =
            baseState === 'Locked' || baseState === 'Unlock' || baseState === 'Sleep'
              ? (baseState as any)
              : null;
          if (base) {
            const mode = resolveMode(base);
            const useBeginning = mode === 'beginning';
            (video.children as AnyLayer[]).forEach((child: AnyLayer) => {
              const id = String((child as any).id || '');
              const m = id.match(/_(\d+)$/);
              const idx = m ? Number(m[1]) : NaN;
              if (!Number.isFinite(idx)) return;
              const i = idx;
              const initialZ = -i * (i + 1) / 2;
              const finalZ = i * (2 * frameCount - 1 - i) / 2;
              (child as any).zPosition = useBeginning ? initialZ : finalZ;
            });
          }
        }
      }
      if ((l as any).children?.length) {
        applySyncVideoZ((l as any).children as AnyLayer[]);
      }
    }
  };
  applySyncVideoZ(rootCopy);
  return rootCopy;
};

export const applyGyroTransforms = (
  layers: AnyLayer[],
  gyroX: number,
  gyroY: number,
  wallpaperParallaxGroups?: Array<{ layerName: string; keyPath: string; axis: string; mapMinTo: number; mapMaxTo: number }>
): AnyLayer[] => {
  const frame = JSON.parse(JSON.stringify(layers)) as AnyLayer[];
  
  const mapRange = (value: number, b1: number, b2: number) => {
    const a1 = -1;
    const a2 = 1;
    return b1 + ((value - a1) * (b2 - b1)) / (a2 - a1);
  };
  
  const walk = (arr: AnyLayer[]) => {
    for (const l of arr) {
      if (l.type === 'transform') {
        const parallaxTransform = wallpaperParallaxGroups?.filter(g => g.layerName === l.name);
        const transformPositionX = parallaxTransform?.filter(g => g.keyPath === 'position.x')[0];
        const transformPositionY = parallaxTransform?.filter(g => g.keyPath === 'position.y')[0];

        let positionXDelta = null;
        let positionYDelta = null;

        if (transformPositionX) {
          let gyroValue = transformPositionX.axis === 'x' ? gyroX : gyroY;
          if (transformPositionX.mapMinTo > transformPositionX.mapMaxTo) {
            gyroValue = -gyroValue;
          }
          const targetValue = mapRange(gyroValue, transformPositionX.mapMinTo, transformPositionX.mapMaxTo);
          positionXDelta = targetValue;
        }

        if (transformPositionY) {
          const gyroValue = transformPositionY.axis === 'x' ? gyroX : gyroY;
          const targetValue = mapRange(gyroValue, transformPositionY.mapMinTo, transformPositionY.mapMaxTo);
          positionYDelta = targetValue;
        }

        if (positionXDelta !== null) {
          l.position.x = positionXDelta;
        }
        if (positionYDelta !== null) {
          l.position.y = positionYDelta;
        }
      }
      if (l.children?.length) {
        walk(l.children);
      }
    }
  };
  
  walk(frame);
  return frame;
};
