import { AnyLayer, TextLayer } from "@/lib/ca/types";
import { findById } from "@/lib/editor/layer-utils";

export const applyOverrides = (
  layers: AnyLayer[],
  overrides: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>> | undefined,
  state: string | undefined
): AnyLayer[] => {
  if (!overrides || !state || state === 'Base State') return layers;
  const rootCopy = structuredClone(layers);
  let list = overrides[state] || [];
  if ((!list || list.length === 0) && /\s(Light|Dark)$/.test(String(state))) {
    const base = String(state).replace(/\s(Light|Dark)$/, '');
    list = overrides[base] || [];
  }
  for (const o of list) {
    const target = findById(rootCopy, o.targetId?.trim()) || findById(rootCopy, o.targetId);
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
      target.rotationX = v;
    } else if (kp === 'transform.rotation.y' && typeof v === 'number') {
      target.rotationY = v;
    } else if (kp === 'opacity' && typeof v === 'number') {
      target.opacity = v;
    } else if (kp === 'cornerradius' && typeof v === 'number') {
      target.cornerRadius = v;
    } else if (kp === 'borderwidth' && typeof v === 'number') {
      target.borderWidth = v;
    } else if (kp === 'fontsize' && typeof v === 'number') {
      (target as TextLayer).fontSize = v;
    } else if (kp === 'backgroundcolor' && typeof v === 'string') {
      target.backgroundColor = v;
    } else if (kp === 'bordercolor' && typeof v === 'string') {
      target.borderColor = v;
    } else if (kp === 'color' && typeof v === 'string') {
      (target as TextLayer).color = v;
    }
  }
  return rootCopy;
};
