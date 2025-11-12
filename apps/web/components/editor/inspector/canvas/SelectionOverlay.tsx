
import React, { MouseEvent as ReactMouseEvent, useRef } from "react";
import { AnyLayer } from "@/lib/ca/types";
import { ProjectDocument, useEditor } from "../../editor-context";
import { clientToWorld, computeAbsoluteLTFor, computeCssLT, getAnchor, getParentAbsContextFor, getRootFlip } from "../../canvas-preview/utils/coordinates";
import { findPathTo } from "../../canvas-preview/utils/layerTree";

interface SelectionOverlayProps {
  layer: AnyLayer;
  renderedLayers: AnyLayer[];
  scale: number;
  showAnchorPoint: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  docRef: React.RefObject<ProjectDocument | null>;
  baseOffsetX: number;
  baseOffsetY: number;
  pan: { x: number; y: number };
  snapRotationEnabled: boolean;
  snapResizeEnabled: boolean;
  snapEdgesEnabled: boolean;
  snapLayersEnabled: boolean;
  SNAP_THRESHOLD: number;
}

const touchToMouseLike = (t: any) => ({
  clientX: t.clientX,
  clientY: t.clientY,
  button: 0,
  preventDefault() {},
  stopPropagation() {},
}) as any;

export default function SelectionOverlay({
  layer,
  renderedLayers,
  scale,
  showAnchorPoint,
  canvasRef,
  docRef,
  baseOffsetX,
  baseOffsetY,
  pan,
  snapRotationEnabled,
  snapResizeEnabled,
  snapEdgesEnabled,
  snapLayersEnabled,
  SNAP_THRESHOLD,
}: SelectionOverlayProps) {
  const {
    doc,
    selectLayer,
    updateLayerTransient,
    updateLayer,
  } = useEditor();
  const rotationDragRef = useRef<
    | {
      id: string;
      centerX: number;
      centerY: number;
      startAngle: number;
      canvasH: number;
      yUp: boolean;
      lastRot: number;
    }
    | null
  >(null);

  const resizeDragRef = useRef<
    | {
      id: string;
      handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
      startX: number;
      startY: number;
      startW: number;
      startH: number;
      startClientX: number;
      startClientY: number;
      startLeft: number;
      startTop: number;
      startAbsLeft: number;
      startAbsTop: number;
      canvasH: number;
      yUp: boolean;
      aX: number;
      aY: number;
      lastX: number;
      lastY: number;
      lastW: number;
      lastH: number;
      parentAbsLeft: number;
      parentAbsTop: number;
      parentH: number;
      parentYUp: boolean;
      rot: number;
      cos: number;
      sin: number;
      hX: number;
      hY: number;
      sX: number;
      sY: number;
      fixUX: number;
      fixUY: number;
      fixX: number;
      fixY: number;
    }
    | null
  >(null);
  const abs = computeAbsoluteLTFor(layer.id, renderedLayers, doc?.meta.height ?? 0, doc?.meta.geometryFlipped);
  const anchor = getAnchor(layer);
  const transformOriginY = abs.useYUp ? (1 - anchor.y) * 100 : anchor.y * 100;
  const inv = 1 / Math.max(0.0001, scale);
  const px = (n: number) => Math.max(0, n * inv);
  const rot = (layer.rotation ?? 0) as number;
  const r180 = ((rot % 180) + 180) % 180;

  const edgeCursor = (axis: 'x' | 'y'): React.CSSProperties["cursor"] => {
    const vertical = r180 >= 45 && r180 < 135;
    if (axis === 'x') return vertical ? 'ns-resize' : 'ew-resize';
    return vertical ? 'ew-resize' : 'ns-resize';
  };

  const cornerCursor = (corner: 'nw' | 'ne' | 'se' | 'sw'): React.CSSProperties["cursor"] => {
    const flip = r180 >= 45 && r180 < 135;
    const base = (corner === 'nw' || corner === 'se') ? 'nwse-resize' : 'nesw-resize';
    if (!flip) return base;
    return base === 'nwse-resize' ? 'nesw-resize' : 'nwse-resize';
  };

  const boxStyle: React.CSSProperties = {
    position: "absolute",
    left: abs.left,
    top: abs.top,
    width: layer.size.w,
    height: layer.size.h,
    transform: `rotateX(${-(layer.rotationX ?? 0)}deg) rotateY(${-(layer.rotationY ?? 0)}deg) rotate(${-(layer.rotation ?? 0)}deg)`,
    transformOrigin: `${anchor.x * 100}% ${transformOriginY}%`,
    backfaceVisibility: "hidden",
    outline: `${px(1)}px solid rgba(59,130,246,0.9)`,
    boxShadow: `inset 0 0 0 ${px(2)}px rgba(59,130,246,0.2)`,
    pointerEvents: "none",
    zIndex: 10000,
  };

  const handleStyleBase: React.CSSProperties = {
    position: "absolute",
    width: px(12),
    height: px(12),
    background: "#ffffff",
    border: `${px(1)}px solid #3b82f6`,
    borderRadius: px(2),
    boxShadow: `0 0 0 ${px(1)}px rgba(0,0,0,0.05)`,
    transform: "translate(-50%, -50%)",
    pointerEvents: "auto",
    cursor: "nwse-resize",
  };

  let handles: Array<{ key: string; x: string | number; y: string | number; cursor: React.CSSProperties["cursor"]; h: any }> = [];

  if (layer.type === 'text') {
    const wrapped = ((layer.wrapped ?? 1) as number) === 1;
    if (wrapped) {
      handles = [
        { key: "e", x: "100%", y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(layer, "e", e) },
        { key: "w", x: 0, y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(layer, "w", e) },
      ];
    } else {
      handles = [];
    }
  } else {
    handles = [
      { key: "nw", x: 0, y: 0, cursor: cornerCursor('nw'), h: (e: any) => beginResize(layer, "nw", e) },
      { key: "n", x: "50%", y: 0, cursor: edgeCursor('y'), h: (e: any) => beginResize(layer, "n", e) },
      { key: "ne", x: "100%", y: 0, cursor: cornerCursor('ne'), h: (e: any) => beginResize(layer, "ne", e) },
      { key: "e", x: "100%", y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(layer, "e", e) },
      { key: "se", x: "100%", y: "100%", cursor: cornerCursor('se'), h: (e: any) => beginResize(layer, "se", e) },
      { key: "s", x: "50%", y: "100%", cursor: edgeCursor('y'), h: (e: any) => beginResize(layer, "s", e) },
      { key: "sw", x: 0, y: "100%", cursor: cornerCursor('sw'), h: (e: any) => beginResize(layer, "sw", e) },
      { key: "w", x: 0, y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(layer, "w", e) },
    ];
  }

  const rotationHandleStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: -px(20),
    width: px(10),
    height: px(10),
    background: "#fff",
    border: `${px(1)}px solid #3b82f6`,
    borderRadius: 9999,
    transform: "translate(-50%, -50%)",
    cursor: "grab",
    pointerEvents: "auto",
  };

  const getRenderContextFor = (id: string): { containerH: number; useYUp: boolean } => {
    let useYUp = getRootFlip(doc?.meta.geometryFlipped) === 0;
    let containerH = doc?.meta.height ?? 0;
    const path = findPathTo(renderedLayers, id);
    if (!path || path.length === 0) return { containerH, useYUp };
    for (let i = 0; i < path.length - 1; i++) {
      const node = path[i];
      if (node.children?.length) {
        useYUp = (typeof node.geometryFlipped === 'number') ? (node.geometryFlipped === 0) : useYUp;
        containerH = node.size.h;
      }
    }
    return { containerH, useYUp };
  };

  const beginResize = (l: AnyLayer, handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw", e: ReactMouseEvent) => {
    if (e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    const ctx = getRenderContextFor(l.id);
    const canvasH = ctx.containerH;
    const yUp = ctx.useYUp;
    const startLT = computeCssLT(l, canvasH, yUp, doc?.meta.height ?? 0);
    const a = getAnchor(l);
    const parentCtx = getParentAbsContextFor(l.id, renderedLayers, doc?.meta.height ?? 0, doc?.meta.geometryFlipped);
    const rotDeg = (l.rotation ?? 0) as number;
    const theta = -((rotDeg || 0) * Math.PI / 180);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const handleToFactors = (h: typeof handle) => {
      const ax = a.x;
      const ay = a.y;
      if (h === "e") return { hx: 1, hy: ay };
      if (h === "w") return { hx: 0, hy: ay };
      if (h === "n") return { hx: ax, hy: 0 };
      if (h === "s") return { hx: ax, hy: 1 };
      if (h === "ne") return { hx: 1, hy: 0 };
      if (h === "nw") return { hx: 0, hy: 0 };
      if (h === "se") return { hx: 1, hy: 1 };
      return { hx: 0, hy: 1 };
    };
    const { hx, hy } = handleToFactors(handle);
    const sx = hx - a.x;
    const sy = hy - a.y;
    const oppositeFor = (h: typeof handle) => {
      switch (h) {
        case 'e': return { ux: 0, uy: a.y };
        case 'w': return { ux: 1, uy: a.y };
        case 'n': return { ux: a.x, uy: 1 };
        case 's': return { ux: a.x, uy: 0 };
        case 'ne': return { ux: 0, uy: 1 };
        case 'nw': return { ux: 1, uy: 1 };
        case 'se': return { ux: 0, uy: 0 };
        case 'sw': return { ux: 1, uy: 0 };
      }
    };
    const opp = oppositeFor(handle);
    const anchorAbsX0 = (parentCtx.left + startLT.left) + a.x * l.size.w;
    const anchorAbsY0 = (parentCtx.top + startLT.top) + (parentCtx.useYUp ? (1 - a.y) * l.size.h : a.y * l.size.h);
    const dx0 = (opp.ux - a.x) * l.size.w;
    const dy0 = (opp.uy - a.y) * l.size.h;
    const worldDX0 = c * dx0 - s * dy0;
    const worldDY0 = s * dx0 + c * dy0;
    const fixX = anchorAbsX0 + worldDX0;
    const fixY = anchorAbsY0 + worldDY0;
    resizeDragRef.current = {
      id: l.id,
      handle,
      startX: l.position.x,
      startY: l.position.y,
      startW: l.size.w,
      startH: l.size.h,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: startLT.left,
      startTop: startLT.top,
      startAbsLeft: parentCtx.left + startLT.left,
      startAbsTop: parentCtx.top + startLT.top,
      canvasH,
      yUp,
      aX: a.x,
      aY: a.y,
      lastX: l.position.x,
      lastY: l.position.y,
      lastW: l.size.w,
      lastH: l.size.h,
      parentAbsLeft: parentCtx.left,
      parentAbsTop: parentCtx.top,
      parentH: parentCtx.containerH,
      parentYUp: parentCtx.useYUp,
      rot: rotDeg,
      cos: c,
      sin: s,
      hX: hx,
      hY: hy,
      sX: sx,
      sY: sy,
      fixUX: opp.ux,
      fixUY: opp.uy,
      fixX,
      fixY,
    };
    const onMove = (ev: MouseEvent) => {
      const d = resizeDragRef.current;
      if (!d) return;
      const mouseWorld = clientToWorld(
        ev.clientX,
        ev.clientY,
        canvasRef,
        baseOffsetX,
        baseOffsetY,
        pan,
        scale
      );
      const dvx = mouseWorld.x - d.fixX;
      const dvy = mouseWorld.y - d.fixY;
      const lx = dvx * d.cos + dvy * d.sin;
      const ly = -dvx * d.sin + dvy * d.cos;
      const dxH = d.hX - d.fixUX;
      const dyH = d.hY - d.fixUY;
      let w = d.startW;
      let h = d.startH;
      const eps = 1e-6;
      if (d.handle === "e" || d.handle === "w") {
        if (Math.abs(dxH) > eps) w = Math.max(1, lx / dxH);
      } else if (d.handle === "n" || d.handle === "s") {
        if (Math.abs(dyH) > eps) h = Math.max(1, ly / dyH);
      } else {
        if (Math.abs(dxH) > eps) w = Math.max(1, lx / dxH);
        if (Math.abs(dyH) > eps) h = Math.max(1, ly / dyH);
      }

      const normRot = ((d.rot % 360) + 360) % 360;
      if (snapResizeEnabled && (normRot < 0.0001 || Math.abs(normRot - 180) < 0.0001)) {
        const canvasW = docRef.current?.meta.width ?? 0;
        const canvasH = docRef.current?.meta.height ?? 0;
        const th = SNAP_THRESHOLD;
        const affectsW = ["e", "w", "ne", "se", "sw", "nw"].includes(d.handle);
        const affectsH = ["n", "s", "ne", "se", "sw", "nw"].includes(d.handle);
        let testLeft = d.startLeft;
        let testTop = d.startTop;
        switch (d.handle) {
          case "w":
          case "nw":
          case "sw":
            testLeft = d.startLeft + d.startW - w;
            break;
        }
        switch (d.handle) {
          case "n":
          case "ne":
          case "nw":
            testTop = d.startTop + d.startH - h;
            break;
        }
        const testLeftAbs = testLeft + d.parentAbsLeft;
        const testTopAbs = testTop + d.parentAbsTop;
        const testRightAbs = testLeftAbs + w;
        const testBottomAbs = testTopAbs + h;
        const xTargets: number[] = [];
        const yTargets: number[] = [];
        if (snapEdgesEnabled) {
          xTargets.push(0, canvasW);
          yTargets.push(0, canvasH);
        }
        if (snapLayersEnabled) {
          const others = (renderedLayers || []).filter((ol) => ol.id !== d.id);
          for (const ol of others) {
            const L = ol as any;
            const lw = L.size?.w ?? 0;
            const lh = L.size?.h ?? 0;
            const ltAbs = computeAbsoluteLTFor(L.id, renderedLayers, doc?.meta.height ?? 0, doc?.meta.geometryFlipped);
            const left = ltAbs.left;
            const right = ltAbs.left + lw;
            const top = ltAbs.top;
            const bottom = ltAbs.top + lh;
            const pushX = (v: number) => { if (!snapEdgesEnabled && (v === 0 || v === canvasW)) return; xTargets.push(v); };
            const pushY = (v: number) => { if (!snapEdgesEnabled && (v === 0 || v === canvasH)) return; yTargets.push(v); };
            pushX(left);
            pushX(right);
            pushY(top);
            pushY(bottom);
          }
        }
        if (affectsW) {
          const snapLeft = ["w", "nw", "sw"].includes(d.handle);
          const snapRight = ["e", "ne", "se"].includes(d.handle);
          if (snapLeft) {
            let bestDist = th + 1;
            let bestTarget: number | null = null;
            for (const target of xTargets) {
              const dist = Math.abs(testLeftAbs - target);
              if (dist <= th && dist < bestDist) { bestDist = dist; bestTarget = target; }
            }
            if (bestTarget !== null) {
              const startRightAbs = d.startAbsLeft + d.startW;
              w = startRightAbs - bestTarget;
            }
          }
          if (snapRight) {
            let bestDist = th + 1;
            let bestTarget: number | null = null;
            for (const target of xTargets) {
              const dist = Math.abs(testRightAbs - target);
              if (dist <= th && dist < bestDist) { bestDist = dist; bestTarget = target; }
            }
            if (bestTarget !== null) {
              w = bestTarget - testLeftAbs;
            }
          }
        }
        if (affectsH) {
          const snapTop = ["n", "ne", "nw"].includes(d.handle);
          const snapBottom = ["s", "se", "sw"].includes(d.handle);
          if (snapTop) {
            let bestDist = th + 1;
            let bestTarget: number | null = null;
            for (const target of yTargets) {
              const dist = Math.abs(testTopAbs - target);
              if (dist <= th && dist < bestDist) { bestDist = dist; bestTarget = target; }
            }
            if (bestTarget !== null) {
              const startBottomAbs = d.startAbsTop + d.startH;
              h = startBottomAbs - bestTarget;
            }
          }
          if (snapBottom) {
            let bestDist = th + 1;
            let bestTarget: number | null = null;
            for (const target of yTargets) {
              const dist = Math.abs(testBottomAbs - target);
              if (dist <= th && dist < bestDist) { bestDist = dist; bestTarget = target; }
            }
            if (bestTarget !== null) {
              h = bestTarget - testTopAbs;
            }
          }
        }
        w = Math.max(1, w);
        h = Math.max(1, h);
      }
      if (ev.shiftKey && d.startW > 0 && d.startH > 0) {
        const aspect = d.startW / d.startH;
        const affectsW = ["e", "w", "ne", "se", "sw", "nw"].includes(d.handle);
        const affectsH = ["n", "s", "ne", "se", "sw", "nw"].includes(d.handle);
        if (affectsW && !affectsH) {
          h = Math.max(1, w / aspect);
        } else if (!affectsW && affectsH) {
          w = Math.max(1, h * aspect);
        } else if (affectsW && affectsH) {
          const dw = Math.abs(w - d.startW);
          const dh = Math.abs(h - d.startH);
          if (dw >= dh) h = Math.max(1, w / aspect);
          else w = Math.max(1, h * aspect);
        }
      }
      const dxn = (d.fixUX - d.aX) * w;
      const dyn = (d.fixUY - d.aY) * h;
      const worldDXn = d.cos * dxn - d.sin * dyn;
      const worldDYn = d.sin * dxn + d.cos * dyn;
      const anchorX = d.fixX - worldDXn;
      const anchorY = d.fixY - worldDYn;
      const localLeft = (anchorX - d.aX * w) - d.parentAbsLeft;
      const localTop = (anchorY - (d.parentYUp ? (1 - d.aY) * h : d.aY * h)) - d.parentAbsTop;
      const x = localLeft + d.aX * w;
      const y = d.parentYUp
        ? ((d.parentH - localTop) - (1 - d.aY) * h)
        : (localTop + d.aY * h);
      updateLayerTransient(d.id, { position: { x, y } as any, size: { w, h } as any });
      d.lastX = x; d.lastY = y; d.lastW = w; d.lastH = h;
    };
    const onTouchMove = (tev: TouchEvent) => {
      const t = tev.touches[0];
      if (!t) return;
      // Map to MouseEvent-like
      onMove({ clientX: t.clientX, clientY: t.clientY, shiftKey: false } as any as MouseEvent);
      tev.preventDefault();
    };
    const onUp = () => {
      const d = resizeDragRef.current;
      if (d) {
        updateLayer(d.id, { position: { x: d.lastX, y: d.lastY } as any, size: { w: d.lastW, h: d.lastH } as any });
      }
      resizeDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove as any, { passive: false } as any);
    window.addEventListener("touchend", onUp, { passive: false } as any);
  };

  const beginRotate = (
    l: AnyLayer,
    e: ReactMouseEvent,
  ) => {
    if (e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    const abs = computeAbsoluteLTFor(l.id, renderedLayers, doc?.meta.height ?? 0, doc?.meta.geometryFlipped);
    const canvasH = docRef.current?.meta.height ?? 0;
    const yUp = abs.useYUp;
    const lt = { left: abs.left, top: abs.top };
    const a = getAnchor(l);
    const centerX = lt.left + a.x * l.size.w;
    const centerY = lt.top + (yUp ? (1 - a.y) * l.size.h : a.y * l.size.h);
    const world = clientToWorld(
      e.clientX,
      e.clientY,
      canvasRef,
      baseOffsetX,
      baseOffsetY,
      pan,
      scale
    );
    const angle0 = Math.atan2(world.y - centerY, world.x - centerX) * 180 / Math.PI;
    rotationDragRef.current = { id: l.id, centerX, centerY, startAngle: angle0 + (l.rotation ?? 0), canvasH, yUp, lastRot: l.rotation ?? 0 };
    const onMove = (ev: MouseEvent) => {
      const d = rotationDragRef.current;
      if (!d) return;
      const wpt = clientToWorld(
        ev.clientX,
        ev.clientY,
        canvasRef,
        baseOffsetX,
        baseOffsetY,
        pan,
        scale
      );
      let angle = Math.atan2(wpt.y - d.centerY, wpt.x - d.centerX) * 180 / Math.PI;
      if (ev.shiftKey) {
        angle = Math.round(angle / 15) * 15;
      }
      let rot = -(angle - d.startAngle);
      if (snapRotationEnabled) {
        const tolerance = 6;
        const norm = ((rot % 360) + 360) % 360;
        const targets = [0, 90, 180, 270];
        let snappedRot = rot;
        for (const t of targets) {
          let diff = norm - t;
          diff = ((diff + 180) % 360) - 180;
          if (Math.abs(diff) <= tolerance) {
            snappedRot = rot - diff;
            break;
          }
        }
        rot = snappedRot;
      }
      d.lastRot = rot;
      updateLayerTransient(d.id, { rotation: rot as any });
    };
    const onTouchMove = (tev: TouchEvent) => {
      const t = tev.touches[0];
      if (!t) return;
      onMove({ clientX: t.clientX, clientY: t.clientY, shiftKey: false } as any as MouseEvent);
      tev.preventDefault();
    };
    const onUp = () => {
      const d = rotationDragRef.current;
      if (d) {
        updateLayer(d.id, { rotation: d.lastRot as any });
      }
      rotationDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove as any, { passive: false } as any);
    window.addEventListener("touchend", onUp, { passive: false } as any);
  };

  return (
    <div style={boxStyle}>
      {/* Resize handles */}
      {handles.map((h) => {
        const hitStyle: React.CSSProperties = {
          position: 'absolute',
          left: h.x as any,
          top: h.y as any,
          width: px(20),
          height: px(20),
          transform: 'translate(-50%, -50%)',
          background: 'transparent',
          pointerEvents: 'auto',
          cursor: h.cursor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        };
        const innerStyle: React.CSSProperties = {
          ...handleStyleBase,
          position: 'static',
          transform: 'none',
          cursor: h.cursor,
        };
        return (
          <div
            key={h.key}
            style={hitStyle}
            onMouseDown={h.h}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                e.preventDefault();
                (h.h as any)(touchToMouseLike(e.touches[0]));
              }
            }}
          >
            <div style={innerStyle} />
          </div>
        );
      })}

      {/* Rotation handle */}
      <div
        style={rotationHandleStyle}
        onMouseDown={(e) => beginRotate(layer, e)}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            e.preventDefault();
            beginRotate(layer, touchToMouseLike(e.touches[0]));
          }
        }}
      />

      {/* Anchor point indicator */}
      {showAnchorPoint && (
        <div
          style={{
            position: "absolute",
            left: `${anchor.x * 100}%`,
            top: `${transformOriginY}%`,
            width: px(8),
            height: px(8),
            background: "#ef4444",
            border: `${px(1.5)}px solid #ffffff`,
            borderRadius: 9999,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            boxShadow: `0 0 0 ${px(1)}px rgba(0,0,0,0.2)`,
            zIndex: 1,
          }}
        />
      )}
    </div>
  );
}
