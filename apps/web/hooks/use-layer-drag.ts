import { useRef, RefObject } from 'react';
import { AnyLayer } from '@/lib/ca/types';
import { getAnchor, computeCssLT, getRootFlip, computeAbsoluteLTFor, getParentAbsContextFor } from '@/components/editor/canvas-preview/utils/coordinates';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEditor } from '@/components/editor/editor-context';

interface UseLayerDragProps {
  scale: number;
  snapEdgesEnabled: boolean;
  snapLayersEnabled: boolean;
  SNAP_THRESHOLD: number;
  renderedLayers: AnyLayer[];
  docRef: RefObject<any>;
  setSnapState: (state: { x: number | null; y: number | null }) => void;
}

export function useLayerDrag({
  scale,
  snapEdgesEnabled,
  snapLayersEnabled,
  SNAP_THRESHOLD,
  renderedLayers,
  docRef,
  setSnapState,
  // computeAbsoluteLTFor,
  // getParentAbsContextFor,
}: UseLayerDragProps) {
  const {
    doc,
    selectLayer,
    updateLayer,
    updateLayerTransient,
  } = useEditor();
  const draggingRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    w: number;
    h: number;
    lastX: number;
    lastY: number;
    canvasH: number;
    yUp: boolean;
  } | null>(null);
  
  const cssToPosition = (cssLeft: number, cssTop: number, l: AnyLayer, containerH: number, useYUp: boolean) => {
    const a = getAnchor(l);
    const CH = Number.isFinite(containerH) ? Number(containerH) : Number(docRef.current?.meta.height ?? 0);
    const w = Number((l as any).size?.w ?? 0);
    const h = Number((l as any).size?.h ?? 0);
    const ax = Number((a as any)?.x ?? 0.5);
    const ay = Number((a as any)?.y ?? 0.5);
    const x = Number(cssLeft) + ax * w;
    const y = useYUp ? ((CH - Number(cssTop)) - (1 - ay) * h) : (Number(cssTop) + ay * h);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
    };
  };

  const startDrag = (l: AnyLayer, e: ReactMouseEvent, containerH?: number, useYUp?: boolean) => {
    if (e.shiftKey || e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    const canvasH = containerH ?? (docRef.current?.meta.height ?? 0);
    const yUp = useYUp ?? (getRootFlip(doc?.meta.geometryFlipped) === 0);
    const startLT = computeCssLT(l, canvasH, yUp, docRef.current?.meta.height ?? 0);
    draggingRef.current = {
      id: l.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: startLT.left,
      startY: startLT.top,
      w: l.size.w,
      h: l.size.h,
      lastX: (l as any).position?.x ?? 0,
      lastY: (l as any).position?.y ?? 0,
      canvasH,
      yUp,
    };
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startClientX) / scale;
      const dy = (ev.clientY - d.startClientY) / scale;
      let cssLeft = d.startX + dx;
      let cssTop = d.startY + dy;
      const canvasW = docRef.current?.meta.width ?? 0;
      const canvasH = docRef.current?.meta.height ?? 0;
      const h = d.canvasH as number;
      
      if (canvasW > 0 && canvasH > 0 && (snapEdgesEnabled || snapLayersEnabled)) {
        const th = SNAP_THRESHOLD;
        const xPairs: Array<[number, number]> = [];
        const yPairs: Array<[number, number]> = [];

        const parentAbs = getParentAbsContextFor(d.id, renderedLayers, doc?.meta.height ?? 0, doc?.meta.geometryFlipped);
        const absLeft = parentAbs.left + cssLeft;
        const absTop = parentAbs.top + cssTop;

        if (snapEdgesEnabled) {
          xPairs.push([0 - parentAbs.left, 0], [(canvasW - d.w) / 2 - parentAbs.left, canvasW / 2], [canvasW - d.w - parentAbs.left, canvasW]);
          yPairs.push([0 - parentAbs.top, 0], [(canvasH - d.h) / 2 - parentAbs.top, canvasH / 2], [canvasH - d.h - parentAbs.top, canvasH]);
        }
        
        if (snapLayersEnabled) {
          const others = (renderedLayers || []).filter((ol) => ol.id !== d.id);
          for (const ol of others) {
            const L = ol as any;
            const lw = L.size?.w ?? 0;
            const lh = L.size?.h ?? 0;
            const otherAbs = computeAbsoluteLTFor(ol.id, renderedLayers, doc?.meta.height ?? 0, doc?.meta.geometryFlipped);
            const left = otherAbs.left - parentAbs.left;
            const right = left + lw;
            const cx = left + lw / 2;
            const top = otherAbs.top - parentAbs.top;
            const bottom = top + lh;
            const cy = top + lh / 2;
            
            const pushIfNotCanvasEdgeX = (t: number, g: number) => {
              if (!snapEdgesEnabled && (g === 0 || g === canvasW)) return;
              xPairs.push([t, g]);
            };
            const pushIfNotCanvasEdgeY = (t: number, g: number) => {
              if (!snapEdgesEnabled && (g === 0 || g === canvasH)) return;
              yPairs.push([t, g]);
            };
            
            pushIfNotCanvasEdgeX(left, otherAbs.left);
            pushIfNotCanvasEdgeX(right, otherAbs.left + lw);
            pushIfNotCanvasEdgeX(right - d.w, otherAbs.left + lw);
            pushIfNotCanvasEdgeX(left - d.w, otherAbs.left);
            pushIfNotCanvasEdgeX(cx - d.w / 2, otherAbs.left + lw / 2);
            pushIfNotCanvasEdgeY(top, otherAbs.top);
            pushIfNotCanvasEdgeY(bottom, otherAbs.top + lh);
            pushIfNotCanvasEdgeY(bottom - d.h, otherAbs.top + lh);
            pushIfNotCanvasEdgeY(top - d.h, otherAbs.top);
            pushIfNotCanvasEdgeY(cy - d.h / 2, otherAbs.top + lh / 2);
          }
        }
        
        const nearestPair = (val: number, pairs: Array<[number, number]>) => {
          let best = val;
          let guide: number | null = null;
          let bestDist = th + 1;
          for (const [t, g] of pairs) {
            const dist = Math.abs(val - t);
            if (dist <= th && dist < bestDist) { 
              best = t; 
              bestDist = dist; 
              guide = g; 
            }
          }
          return { value: best, guide };
        };
        
        const nx = nearestPair(cssLeft, xPairs);
        const ny = nearestPair(cssTop, yPairs);
        cssLeft = nx.value; 
        cssTop = ny.value;
        setSnapState({ x: nx.guide, y: ny.guide });
      } else {
        setSnapState({ x: null, y: null });
      }
      
      const pos = cssToPosition(cssLeft, cssTop, (renderedLayers.find(r => r.id === d.id) as AnyLayer) || (l as AnyLayer), h, d.yUp as boolean);
      updateLayerTransient(d.id, { position: { x: pos.x, y: pos.y } as any });
      d.lastX = pos.x;
      d.lastY = pos.y;
    };

    const onTouchMove = (tev: TouchEvent) => {
      const t = tev.touches[0];
      if (!t) return;
      onMove({ clientX: t.clientX, clientY: t.clientY } as any as MouseEvent);
      tev.preventDefault();
    };

    const onUp = (_ev: MouseEvent | TouchEvent) => {
      const d = draggingRef.current;
      if (d) {
        updateLayer(d.id, { position: { x: d.lastX, y: d.lastY } as any });
      }
      draggingRef.current = null;
      document.body.style.userSelect = "";
      setSnapState({ x: null, y: null });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onUp as any);
    };
    
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp as any);
    window.addEventListener("touchmove", onTouchMove as any, { passive: false } as any);
    window.addEventListener("touchend", onUp as any, { passive: false } as any);
  };

  return {
    draggingRef,
    startDrag,
  };
}
