import { AnyLayer } from "@/lib/ca/types";
import { findPathTo } from "./layerTree";

export const getAnchor = (l: AnyLayer) => ({
  x: l.anchorPoint?.x ?? 0.5,
  y: l.anchorPoint?.y ?? 0.5
});

export const computeCssLT = (l: AnyLayer, containerH: number, useYUp: boolean, docHeight?: number) => {
  const anchor = getAnchor(l);
  const CH = Number.isFinite(containerH) ? Number(containerH) : Number(docHeight ?? 0);
  const px = Number(l.position?.x ?? 0);
  const py = Number(l.position?.y ?? 0);
  const w = Number(l.size?.w ?? 0);
  const h = Number(l.size?.h ?? 0);
  const ax = Number(anchor?.x ?? 0.5);
  const ay = Number(anchor?.y ?? 0.5);
  const left = px - ax * w;
  const top = useYUp ? (CH - (py + (1 - ay) * h)) : (py - ay * h);
  return {
    left: Number.isFinite(left) ? left : 0,
    top: Number.isFinite(top) ? top : 0,
  };
};

export const cssToPosition = (cssLeft: number, cssTop: number, l: AnyLayer, containerH: number, useYUp: boolean, docHeight: number) => {
  const anchor = getAnchor(l);
  const CH = Number.isFinite(containerH) ? Number(containerH) : Number(docHeight);
  const w = Number(l.size?.w ?? 0);
  const h = Number(l.size?.h ?? 0);
  const ax = Number(anchor?.x ?? 0.5);
  const ay = Number(anchor?.y ?? 0.5);
  const x = Number(cssLeft) + ax * w;
  const y = useYUp ? ((CH - Number(cssTop)) - (1 - ay) * h) : (Number(cssTop) + ay * h);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
};

export const getRootFlip = (docMetaGeometryFlipped?: number) => {
  return (docMetaGeometryFlipped ?? 0) as 0 | 1;
};

export const computeAbsoluteLTFor = (
  id: string,
  renderedLayers: AnyLayer[],
  docMetaHeight: number,
  docMetaGeometryFlipped?: number
): { left: number; top: number; useYUp: boolean; containerH: number } => {
  const path = findPathTo(renderedLayers, id);
  let useYUp = getRootFlip(docMetaGeometryFlipped) === 0;
  let containerH = docMetaHeight;
  if (!path || path.length === 0) return { left: 0, top: 0, useYUp, containerH };
  let left = 0;
  let top = 0;
  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const lt = computeCssLT(node, containerH, useYUp, docMetaHeight);
    left += lt.left;
    top += lt.top;
    if (i < path.length - 1 && node.children?.length) {
      useYUp = (typeof node.geometryFlipped === 'number') ? (node.geometryFlipped === 0) : useYUp;
      containerH = node.size.h;
    }
  }
  return { left, top, useYUp, containerH };
};

export const getParentAbsContextFor = (
  id: string,
  renderedLayers: AnyLayer[],
  docMetaHeight: number,
  docMetaGeometryFlipped?: number
): { left: number; top: number; useYUp: boolean; containerH: number } => {
  const path = findPathTo(renderedLayers, id);
  let useYUp = getRootFlip(docMetaGeometryFlipped) === 0;
  let containerH = docMetaHeight;
  if (!path || path.length < 2) return { left: 0, top: 0, useYUp, containerH };
  let left = 0;
  let top = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const node = path[i];
    const lt = computeCssLT(node, containerH, useYUp, docMetaHeight);
    left += lt.left;
    top += lt.top;
    if (node.children?.length) {
      useYUp = (typeof node.geometryFlipped === 'number') ? (node.geometryFlipped === 0) : useYUp;
      containerH = node.size.h;
    }
  }
  return { left, top, useYUp, containerH };
};

export const clientToWorld = (
  clientX: number,
  clientY: number,
  canvasRef: React.RefObject<HTMLDivElement | null>,
  baseOffsetX: number,
  baseOffsetY: number,
  pan: { x: number; y: number },
  scale: number
) => {
  if (!canvasRef.current) return { x: 0, y: 0 };
  const rect = canvasRef.current.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const worldX = (cx - (baseOffsetX + pan.x)) / scale;
  const worldY = (cy - (baseOffsetY + pan.y)) / scale;
  return { x: worldX, y: worldY };
};
