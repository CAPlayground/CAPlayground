"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Crosshair, Square, Crop, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import { useEditor } from "./editor-context";
import { LayerContextMenu } from "./layer-context-menu";
import type { AnyLayer, EmitterLayer, GroupLayer, ShapeLayer } from "@/lib/ca/types";
import { EmitterCanvas } from "./emitter/EmitterCanvas";

export function CanvasPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const {
    doc,
    updateLayer,
    updateLayerTransient,
    selectLayer,
    copySelectedLayer,
    pasteFromClipboard,
    addImageLayerFromBlob,
    addImageLayerFromFile,
    addVideoLayerFromFile,
    isAnimationPlaying,
    setIsAnimationPlaying,
    setAnimatedLayers,
    moveLayer,
    deleteLayer,
  } = useEditor();
  const docRef = useRef<typeof doc>(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [userScale, setUserScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [snapState, setSnapState] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [SNAP_THRESHOLD] = useLocalStorage<number>("caplay_settings_snap_threshold", 12);
  const [snapEdgesEnabled] = useLocalStorage<boolean>("caplay_settings_snap_edges", true);
  const [snapLayersEnabled] = useLocalStorage<boolean>("caplay_settings_snap_layers", true);
  const [snapResizeEnabled] = useLocalStorage<boolean>("caplay_settings_snap_resize", true);
  const [snapRotationEnabled] = useLocalStorage<boolean>("caplay_settings_snap_rotation", true);
  const [showEdgeGuide, setShowEdgeGuide] = useLocalStorage<boolean>("caplay_preview_edge_guide", false);
  const [clipToCanvas, setClipToCanvas] = useLocalStorage<boolean>("caplay_preview_clip", false);
  const [showBackground] = useLocalStorage<boolean>("caplay_preview_show_background", true);
  const [showClockOverlay, setShowClockOverlay] = useLocalStorage<boolean>("caplay_preview_clock_overlay", false);
  const [showAnchorPoint, setShowAnchorPoint] = useLocalStorage<boolean>("caplay_preview_anchor_point", false);
  const panDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // clipboard copy/paste
  useEffect(() => {
    const isImageUrl = (txt: string) => /^(https?:\/\/).+\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(txt.trim());
    const isGifUrl = (txt: string) => /^(https?:\/\/).+\.(gif)(\?.*)?$/i.test(txt.trim());
    const isDataUrl = (txt: string) => /^data:image\//i.test(txt.trim());
    const getFilenameFromUrl = (u: string) => {
      try {
        const url = new URL(u);
        const base = (url.pathname.split('/').pop() || 'image').split('?')[0];
        return base || 'image.png';
      } catch { return 'image.png'; }
    };

  const findSiblingsOf = (layers: AnyLayer[], id: string): { siblings: AnyLayer[]; index: number } | null => {
    const walk = (arr: AnyLayer[]): { siblings: AnyLayer[]; index: number } | null => {
      const idx = arr.findIndex((l) => l.id === id);
      if (idx >= 0) return { siblings: arr, index: idx };
      for (const l of arr) {
        if ((l as any).type === 'group' && Array.isArray((l as any).children)) {
          const res = walk((l as any).children as AnyLayer[]);
          if (res) return res;
        }
      }
      return null;
    };
    return walk(layers);
  };
    const fetchToBlob = async (url: string): Promise<{ blob: Blob; filename?: string } | null> => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!/image\//i.test(ct)) return null;
        const blob = await res.blob();
        return { blob, filename: getFilenameFromUrl(url) };
      } catch { return null; }
    };

    const keyHandler = async (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key !== 'c' && key !== 'v') return;
      e.preventDefault();
      if (key === 'c') {
        copySelectedLayer();
        return;
      }
      if (key === 'v') {
        try {
          if (navigator.clipboard && 'read' in navigator.clipboard) {
            const items = await (navigator.clipboard as any).read();
            for (const item of items) {
              const types: string[] = item.types || [];
              const imgType = types.find((t: string) => /image\//i.test(t));
              if (imgType) {
                const blob = await item.getType(imgType);
                const isGif = /image\/gif/i.test(imgType);
                if (isGif) {
                  try { await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' })); } catch {}
                } else {
                  await addImageLayerFromBlob(blob);
                }
                return;
              }
              const txtType = types.find((t: string) => /text\/(uri-list|plain)/i.test(t));
              if (txtType) {
                try {
                  const t = await item.getType(txtType);
                  const text = await t.text();
                  const line = (text || '').trim().split(/\r?\n/).find(Boolean) || '';
                  if (isDataUrl(line)) {
                    const isGif = /^data:image\/gif/i.test(line);
                    const resp = await fetch(line);
                    const blob = await resp.blob();
                    if (isGif) { try { await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' })); } catch {} }
                    else { await addImageLayerFromBlob(blob); }
                    return;
                  }
                  if (isImageUrl(line)) {
                    if (isGifUrl(line)) {
                      const got = await fetchToBlob(line);
                      if (got) { try { await addVideoLayerFromFile(new File([got.blob], got.filename || 'image.gif', { type: 'image/gif' })); } catch {} }
                      return;
                    }
                    const got = await fetchToBlob(line);
                    if (got) { await addImageLayerFromBlob(got.blob, getFilenameFromUrl(line)); return; }
                  }
                } catch {}
              }
            }
          }
        } catch {}
        try {
          const txt = await navigator.clipboard?.readText?.();
          if (txt) {
            try {
              const data = JSON.parse(txt);
              pasteFromClipboard(data);
              return;
            } catch {}
            const firstLine = txt.trim().split(/\r?\n/).find(Boolean) || '';
            if (isDataUrl(firstLine)) {
              const isGif = /^data:image\/gif/i.test(firstLine);
              try { const resp = await fetch(firstLine); const blob = await resp.blob(); if (isGif) { try { await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' })); } catch {} } else { await addImageLayerFromBlob(blob); } return; } catch {}
            }
            if (isImageUrl(firstLine)) {
              if (isGifUrl(firstLine)) {
                const got = await fetchToBlob(firstLine);
                if (got) { try { await addVideoLayerFromFile(new File([got.blob], got.filename || 'image.gif', { type: 'image/gif' })); } catch {} }
                return;
              }
              const got = await fetchToBlob(firstLine);
              if (got) { await addImageLayerFromBlob(got.blob, getFilenameFromUrl(firstLine)); return; }
            }
          }
        } catch {}
      }
    };
    const pasteHandler = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items || []);
      const fileItem = items.find((it) => it.kind === 'file' && /image\//i.test(it.type));
      if (fileItem) {
        e.preventDefault();
        const blob = fileItem.getAsFile();
        if (blob) {
          if (/image\/gif/i.test(blob.type || '')) {
            try { await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' })); } catch {}
          } else {
            await addImageLayerFromBlob(blob);
          }
        }
        return;
      }
      const textItem = items.find((it) => it.kind === 'string');
      if (textItem) {
        textItem.getAsString((txt) => {
          try {
            const data = JSON.parse(txt);
            if (data && data.__caplay__) {
              e.preventDefault();
              pasteFromClipboard(data);
            }
          } catch {}
        });
      }
      const uriList = e.clipboardData.getData('text/uri-list') || '';
      const plain = e.clipboardData.getData('text/plain') || '';
      const candidate = (uriList || plain || '').trim().split(/\r?\n/).find(Boolean) || '';
      if (candidate) {
        if (isDataUrl(candidate)) {
          const isGif = /^data:image\/gif/i.test(candidate);
          try { e.preventDefault(); const resp = await fetch(candidate); const blob = await resp.blob(); if (isGif) { try { await addVideoLayerFromFile(new File([blob], 'pasted.gif', { type: 'image/gif' })); } catch {} } else { await addImageLayerFromBlob(blob); } return; } catch {}
        }
        if (/^file:\/\//i.test(candidate)) {
        } else if (isImageUrl(candidate)) {
          if (isGifUrl(candidate)) {
            const got = await fetchToBlob(candidate);
            if (got) { e.preventDefault(); try { await addVideoLayerFromFile(new File([got.blob], got.filename || 'image.gif', { type: 'image/gif' })); } catch {} return; }
          }
          const got = await fetchToBlob(candidate);
          if (got) { e.preventDefault(); await addImageLayerFromBlob(got.blob, getFilenameFromUrl(candidate)); return; }
        }
      }
    };
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('paste', pasteHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('paste', pasteHandler);
    };
  }, [copySelectedLayer, pasteFromClipboard, addImageLayerFromBlob]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditable = !!((e.target as HTMLElement | null)?.isContentEditable);
      if (tag === 'input' || tag === 'textarea' || isEditable) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const curKey = doc?.activeCA ?? 'floating';
      const cur = doc?.docs?.[curKey];
      const selId = cur?.selectedId || null;
      if (!selId) return;
      e.preventDefault();
      deleteLayer(selId);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doc, deleteLayer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key;
      if (key !== ']' && key !== '[') return;
      const curKey = doc?.activeCA ?? 'floating';
      const cur = doc?.docs?.[curKey];
      const selId = cur?.selectedId || null;
      if (!cur || !selId) return;
      const res = findSiblingsOf(cur.layers || [], selId);
      if (!res) return;
      const { siblings, index } = res;
      const n = siblings.length;
      if (n <= 1) return;
      e.preventDefault();

      const bringForward = () => {
        if (index < n - 2) {
          moveLayer(selId, siblings[index + 2].id);
        } else if (index === n - 2) {
          moveLayer(siblings[n - 1].id, selId);
        }
      };
      const sendBackward = () => {
        if (index > 0) moveLayer(selId, siblings[index - 1].id);
      };
      const sendToBack = () => {
        if (index > 0) moveLayer(selId, siblings[0].id);
      };
      const bringToFront = () => {
        if (index < n - 1) {
          for (let i = index + 1; i < n; i++) moveLayer(siblings[i].id, selId);
        }
      };

      if (key === ']' && e.shiftKey) return bringToFront();
      if (key === '[' && e.shiftKey) return sendToBack();
      if (key === ']') return bringForward();
      if (key === '[') return sendBackward();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doc, moveLayer]);

  const { fitScale, baseOffsetX, baseOffsetY } = useMemo(() => {
    const w = doc?.meta.width ?? 390;
    const h = doc?.meta.height ?? 844;
    const pad = 16;
    const maxW = size.w - pad * 2;
    const maxH = size.h - pad * 2;
    const s = Math.min(maxW / w, maxH / h);
    const ox = (size.w - w * s) / 2;
    const oy = (size.h - h * s) / 2;
    return { fitScale: s > 0 && Number.isFinite(s) ? s : 1, baseOffsetX: ox, baseOffsetY: oy };
  }, [size.w, size.h, doc?.meta.width, doc?.meta.height]);

  const scale = fitScale * userScale;
  const offsetX = baseOffsetX + pan.x;
  const offsetY = baseOffsetY + pan.y;

  const applyOverrides = (layers: AnyLayer[], overrides: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>> | undefined, state: string | undefined): AnyLayer[] => {
    if (!overrides || !state || state === 'Base State') return layers;
    const map: Record<string, AnyLayer> = {};
    const cloneTree = (arr: AnyLayer[]): AnyLayer[] => arr.map((l) => {
      const copy = JSON.parse(JSON.stringify(l)) as AnyLayer;
      map[copy.id] = copy;
      if ((copy as any).type === 'group' && Array.isArray((copy as any).children)) {
        (copy as any).children = cloneTree((copy as any).children);
      }
      return copy;
    });
    const rootCopy = cloneTree(layers);
    let list = overrides[state] || [];
    if ((!list || list.length === 0) && /\s(Light|Dark)$/.test(String(state))) {
      const base = String(state).replace(/\s(Light|Dark)$/,'');
      list = overrides[base] || [];
    }
    for (const o of list) {
      const target = map[o.targetId?.trim()] || map[o.targetId];
      if (!target) continue;
      const kp = (o.keyPath || '').toLowerCase();
      const v = o.value;
      if (kp === 'position.y' && typeof v === 'number') {
        (target as any).position = { ...(target as any).position, y: v };
      } else if (kp === 'position.x' && typeof v === 'number') {
        (target as any).position = { ...(target as any).position, x: v };
      } else if (kp === 'bounds.size.width' && typeof v === 'number') {
        (target as any).size = { ...(target as any).size, w: v };
      } else if (kp === 'bounds.size.height' && typeof v === 'number') {
        (target as any).size = { ...(target as any).size, h: v };
      } else if ((kp === 'transform.rotation' || kp === 'transform.rotation.z') && typeof v === 'number') {
        (target as any).rotation = v;
      } else if (kp === 'transform.rotation.x' && typeof v === 'number') {
        (target as any).rotationX = v as number;
      } else if (kp === 'transform.rotation.y' && typeof v === 'number') {
        (target as any).rotationY = v as number;
      } else if (kp === 'opacity' && typeof v === 'number') {
        (target as any).opacity = v as any;
      } else if (kp === 'cornerradius' && typeof v === 'number') {
        (target as any).cornerRadius = v as any;
      } else if (kp === 'borderwidth' && typeof v === 'number') {
        (target as any).borderWidth = v as any;
      } else if (kp === 'fontsize' && typeof v === 'number') {
        (target as any).fontSize = v as any;
      } else if (kp === 'backgroundcolor' && typeof v === 'string') {
        (target as any).backgroundColor = v as any;
      } else if (kp === 'bordercolor' && typeof v === 'string') {
        (target as any).borderColor = v as any;
      } else if (kp === 'color' && typeof v === 'string') {
        (target as any).color = v as any;
      }
    }
    return rootCopy;
  };

  const currentKey = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[currentKey];
  const otherKey = currentKey === 'floating' ? 'background' : 'floating';
  const other = doc?.docs?.[otherKey];

  const appliedLayers = useMemo(() => {
    if (!current) return [] as AnyLayer[];
    return applyOverrides(current.layers, current.stateOverrides, current.activeState);
  }, [current?.layers, current?.stateOverrides, current?.activeState]);

  const backgroundLayers = useMemo(() => {
    if (!other || currentKey !== 'floating' || !showBackground) return [] as AnyLayer[];
    return applyOverrides(other.layers, other.stateOverrides, other.activeState);
  }, [other?.layers, other?.stateOverrides, other?.activeState, currentKey, showBackground]);

  const combinedLayers = useMemo(() => {
    if (currentKey === 'floating' && showBackground && backgroundLayers.length > 0) {
      return [...backgroundLayers, ...appliedLayers];
    }
    return appliedLayers;
  }, [appliedLayers, backgroundLayers, currentKey, showBackground]);

  const [renderedLayers, setRenderedLayers] = useState<AnyLayer[]>(combinedLayers);
  useEffect(() => { setRenderedLayers(combinedLayers); }, [combinedLayers]);

  const prevStateRef = useRef<string | undefined>(current?.activeState);
  const animRef = useRef<number | null>(null);

  const indexById = (arr: AnyLayer[]) => {
    const map: Record<string, AnyLayer> = {};
    const walk = (l: AnyLayer) => {
      map[l.id] = l;
      if ((l as any).type === 'group' && Array.isArray((l as any).children)) {
        (l as any).children.forEach(walk);
      }
    };
    arr.forEach(walk);
    return map;
  };

  const getProp = (l: AnyLayer, keyPath: string): number | undefined => {
    if (keyPath === 'position.x') return (l as any).position?.x;
    if (keyPath === 'position.y') return (l as any).position?.y;
    if (keyPath === 'bounds.size.width') return (l as any).size?.w;
    if (keyPath === 'bounds.size.height') return (l as any).size?.h;
    if (keyPath === 'transform.rotation.z') return (l as any).rotation ?? 0;
    if (keyPath === 'transform.rotation.x') return (l as any).rotationX ?? 0;
    if (keyPath === 'transform.rotation.y') return (l as any).rotationY ?? 0;
    if (keyPath === 'opacity') return (l as any).opacity ?? 1;
    if (keyPath === 'cornerRadius') return (l as any).cornerRadius ?? 0;
    return undefined;
  };
  const setProp = (l: AnyLayer, keyPath: string, v: number) => {
    if (keyPath === 'position.x') (l as any).position = { ...(l as any).position, x: v };
    else if (keyPath === 'position.y') (l as any).position = { ...(l as any).position, y: v };
    else if (keyPath === 'bounds.size.width') (l as any).size = { ...(l as any).size, w: v };
    else if (keyPath === 'bounds.size.height') (l as any).size = { ...(l as any).size, h: v };
    else if (keyPath === 'transform.rotation.z') (l as any).rotation = v as any;
    else if (keyPath === 'transform.rotation.x') (l as any).rotationX = v as any;
    else if (keyPath === 'transform.rotation.y') (l as any).rotationY = v as any;
    else if (keyPath === 'opacity') (l as any).opacity = v as any;
    else if (keyPath === 'cornerRadius') (l as any).cornerRadius = v as any;
  };

  const [timeSec, setTimeSec] = useState(0);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAnimationPlaying) { lastTsRef.current = null; return; }
    let raf: number | null = null;
    const step = (ts: number) => {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      if (last != null) {
        const dt = Math.max(0, (ts - last) / 1000);
        setTimeSec((t) => t + dt);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [isAnimationPlaying]);

  const evalLayerAnimation = (l: AnyLayer, t: number) => {
    if ((l as any).type === 'video') {
      const video = l as any;
      const frameCount = video.frameCount || 0;
      const fps = video.fps || 30;
      const duration = video.duration || (frameCount / fps);
      const autoReverses = video.autoReverses || false;
      
      if (frameCount <= 1) return;
      
      let localT = t % duration;
      if (autoReverses) {
        const cycle = duration * 2;
        const m = t % cycle;
        localT = m <= duration ? m : (cycle - m);
      }
      
      const frameIndex = Math.floor(localT * fps) % frameCount;
      video.currentFrameIndex = frameIndex;
      return;
    }
    
    const anim: any = (l as any).animations;
    if (!anim || !anim.enabled) return;
    const keyPath = (anim.keyPath || 'position') as 'position' | 'position.x' | 'position.y';
    const values = Array.isArray(anim.values) ? anim.values : [];
    const n = values.length;
    if (n <= 1) return;
    const intervals = n - 1;
    const providedDur = Number(anim.durationSeconds);
    const baseDuration = (Number.isFinite(providedDur) && providedDur > 0)
      ? providedDur
      : Math.max(1, intervals);
    
    const speed = Number(anim.speed ?? 1);
    const effectiveSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
    
    const autorev = Number(anim.autoreverses ?? 0) === 1;
    const infinite = Number(anim.infinite ?? 1) === 1;
    const providedRepeat = Number(anim.repeatDurationSeconds);
    const repeatDuration = Number.isFinite(providedRepeat) && providedRepeat > 0
      ? providedRepeat
      : baseDuration;
    
    const speedAdjustedT = t * effectiveSpeed;
    let localT = infinite ? speedAdjustedT : Math.min(speedAdjustedT, repeatDuration * effectiveSpeed);
    if (autorev) {
      const cycle = baseDuration * 2;
      const m = localT % cycle;
      localT = m <= baseDuration ? m : (cycle - m);
    } else {
      localT = localT % baseDuration;
    }
    const segDur = baseDuration / intervals;
    let seg = Math.min(intervals - 1, Math.floor(localT / segDur));
    const segStartT = seg * segDur;
    const f = Math.min(1, Math.max(0, (localT - segStartT) / segDur));

    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
    if (keyPath === 'position') {
      const a: any = values[seg] || { x: (l as any).position?.x ?? 0, y: (l as any).position?.y ?? 0 };
      const b: any = values[seg + 1] || a;
      const nx = lerp(Number(a?.x ?? 0), Number(b?.x ?? 0), f);
      const ny = lerp(Number(a?.y ?? 0), Number(b?.y ?? 0), f);
      (l as any).position = { ...(l as any).position, x: nx, y: ny };
    } else if (keyPath === 'position.x') {
      const a = Number(values[seg] ?? (l as any).position?.x ?? 0);
      const b = Number(values[seg + 1] ?? a);
      const nx = lerp(a, b, f);
      (l as any).position = { ...(l as any).position, x: nx };
    } else if (keyPath === 'position.y') {
      const a = Number(values[seg] ?? (l as any).position?.y ?? 0);
      const b = Number(values[seg + 1] ?? a);
      const ny = lerp(a, b, f);
      (l as any).position = { ...(l as any).position, y: ny };
    } else if (keyPath === 'transform.rotation.z') {
      const a = Number(values[seg] ?? (l as any).rotation ?? 0);
      const b = Number(values[seg + 1] ?? a);
      const nz = lerp(a, b, f);
      (l as any).rotation = nz;
    } else if (keyPath === 'transform.rotation.x') {
      const a = Number(values[seg] ?? (l as any).rotationX ?? 0);
      const b = Number(values[seg + 1] ?? a);
      const nx = lerp(a, b, f);
      (l as any).rotationX = nx;
    } else if (keyPath === 'transform.rotation.y') {
      const a = Number(values[seg] ?? (l as any).rotationY ?? 0);
      const b = Number(values[seg + 1] ?? a);
      const ny = lerp(a, b, f);
      (l as any).rotationY = ny;
    } else if (keyPath === 'opacity') {
      const a = Number(values[seg] ?? (l as any).opacity ?? 1);
      const b = Number(values[seg + 1] ?? a);
      const nop = lerp(a, b, f);
      (l as any).opacity = nop;
    } else if (keyPath === 'bounds') {
      const a: any = values[seg] || { w: (l as any).size?.w ?? 0, h: (l as any).size?.h ?? 0 };
      const b: any = values[seg + 1] || a;
      const nw = lerp(Number(a?.w ?? 0), Number(b?.w ?? 0), f);
      const nh = lerp(Number(a?.h ?? 0), Number(b?.h ?? 0), f);
      (l as any).size = { ...(l as any).size, w: nw, h: nh };
    }
  };

  useEffect(() => {
    const frame = JSON.parse(JSON.stringify(combinedLayers)) as AnyLayer[];
    const walk = (arr: AnyLayer[]) => {
      for (const l of arr) {
        evalLayerAnimation(l, timeSec);
        if ((l as any).type === 'group' && Array.isArray((l as any).children)) {
          walk((l as any).children as AnyLayer[]);
        }
      }
    };
    walk(frame);
    setRenderedLayers(frame);
    setAnimatedLayers(frame);
  }, [timeSec, combinedLayers, setAnimatedLayers]);

  const hasAnyEnabledAnimation = useMemo(() => {
    const check = (arr: AnyLayer[]): boolean => {
      for (const l of arr) {
        const anim: any = (l as any).animations;
        if (anim && anim.enabled) return true;
        if ((l as any).type === 'video') return true;
        if ((l as any).type === 'emitter') return true;
        if ((l as any).type === 'group' && Array.isArray((l as any).children)) {
          if (check((l as any).children as AnyLayer[])) return true;
        }
      }
      return false;
    };
    return check(current?.layers || []);
  }, [current?.layers]);

  useEffect(() => {
    if (!hasAnyEnabledAnimation && isAnimationPlaying) setIsAnimationPlaying(false);
  }, [hasAnyEnabledAnimation, isAnimationPlaying]);

  useEffect(() => {
    const prevState = prevStateRef.current;
    const nextState = current?.activeState;
    if (!doc) return;
    if (prevState === nextState) {
      setRenderedLayers(combinedLayers);
      return;
    }

    const gens: Array<{ elements: { targetId: string; keyPath: string; animation?: { duration?: number } }[] }> = [];
    const addGen = (targetId: string, keyPath: string, duration = 0.8) => {
      if (!gens.length) gens.push({ elements: [] });
      gens[0].elements.push({ targetId, keyPath, animation: { duration } });
    };
    const ovs = current?.stateOverrides || {};
    const pickList = (st?: string): Array<{ targetId: string; keyPath: string; value: any }> => {
      if (!st) return [];
      const base = /\s(Light|Dark)$/.test(String(st)) ? String(st).replace(/\s(Light|Dark)$/,'') : String(st);
      const direct = ovs[st] || [];
      if (direct && direct.length) return direct as any;
      return (ovs[base] || []) as any;
    };
    const toList = pickList(nextState);
    const fromList = pickList(prevState);
    const keys = [
      'position.x','position.y','bounds.size.width','bounds.size.height','transform.rotation.z','transform.rotation.x','transform.rotation.y','opacity','cornerRadius'
    ];
    const byKey = (arr: any[]) => {
      const m = new Map<string, Map<string, number>>();
      for (const it of arr) {
        if (typeof it.value !== 'number') continue;
        if (!m.has(it.targetId)) m.set(it.targetId, new Map());
        m.get(it.targetId)!.set(it.keyPath, it.value);
      }
      return m;
    };
    const fromMap = byKey(fromList);
    const toMap = byKey(toList);
    const ids = new Set<string>([...fromMap.keys(), ...toMap.keys()]);
    ids.forEach(id => {
      keys.forEach(k => {
        const a = fromMap.get(id)?.get(k);
        const b = toMap.get(id)?.get(k);
        if (typeof a === 'number' || typeof b === 'number') {
          addGen(id, k as any, 0.8);
        }
      });
    });
    const transitions = gens as any;

    if (!transitions.length) {
      setRenderedLayers(combinedLayers);
      prevStateRef.current = nextState;
      return;
    }

    const startMap = indexById(renderedLayers.length ? renderedLayers : combinedLayers);
    const endMap = indexById(combinedLayers);
    type Track = { id: string; key: string; from: number; to: number; duration: number };
    const tracks: Track[] = [];

    const addTrack = (id: string, keyPath: string, duration: number) => {
      const sL = startMap[id];
      const eL = endMap[id];
      if (!sL || !eL) return;
      const from = getProp(sL, keyPath);
      const to = getProp(eL, keyPath);
      if (typeof from === 'number' && typeof to === 'number' && from !== to) {
        tracks.push({ id, key: keyPath, from, to, duration });
      }
    };

    for (const tr of transitions) {
      for (const el of tr.elements) {
        const key = el.keyPath;
        if (!['position.x', 'position.y', 'bounds.size.width', 'bounds.size.height', 'transform.rotation.z', 'transform.rotation.x', 'transform.rotation.y', 'opacity', 'cornerRadius'].includes(key)) continue;
        const dur = Math.max(0.1, el.animation?.duration || 0.5);
        addTrack(el.targetId, key, dur);
      }
    }

    if (!tracks.length) {
      setRenderedLayers(combinedLayers);
      prevStateRef.current = nextState;
      return;
    }

    const startTime = performance.now();
    const maxDur = Math.max(...tracks.map(t => t.duration)) * 1000;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = () => {
      const now = performance.now();
      const p = Math.min(1, (now - startTime) / maxDur);
      const frame = JSON.parse(JSON.stringify(appliedLayers)) as AnyLayer[];
      const frameMap = indexById(frame);
      for (const trk of tracks) {
        const localP = Math.min(1, (now - startTime) / (trk.duration * 1000));
        const v = trk.from + (trk.to - trk.from) * ease(localP);
        const L = frameMap[trk.id];
        if (L) setProp(L, trk.key, v);
      }
      setRenderedLayers(frame);
      if (p < 1) animRef.current = requestAnimationFrame(step);
      else {
        animRef.current = null;
        prevStateRef.current = nextState;
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
  }, [current?.activeState, appliedLayers]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key;
      if (key !== '=' && key !== '+' && key !== '-' && key !== '0') return;
      if (!ref.current) return;
      e.preventDefault();

      const rect = ref.current.getBoundingClientRect();
      const clientX = rect.width / 2;
      const clientY = rect.height / 2;
      const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
      const worldY = (clientY - (baseOffsetY + pan.y)) / scale;

      if (key === '0') {
        setUserScale(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const direction = key === '-' ? -1 : 1;
      const nextUserScale = direction > 0
        ? Math.min(5, userScale * 1.1)
        : Math.max(0.2, userScale / 1.1);
      const nextScale = fitScale * nextUserScale;
      const nextPanX = clientX - worldX * nextScale - baseOffsetX;
      const nextPanY = clientY - worldY * nextScale - baseOffsetY;
      setUserScale(nextUserScale);
      setPan({ x: nextPanX, y: nextPanY });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [baseOffsetX, baseOffsetY, fitScale, pan.x, pan.y, scale, userScale]);

  // Anchor/flip helpers used by drag and render
  const getAnchor = (l: AnyLayer) => ({ x: (l as any).anchorPoint?.x ?? 0.5, y: (l as any).anchorPoint?.y ?? 0.5 });
  const getRootFlip = () => (doc?.meta.geometryFlipped ?? 0) as 0 | 1;
  const computeCssLT = (l: AnyLayer, containerH: number, useYUp: boolean) => {
    const a = getAnchor(l);
    const CH = Number.isFinite(containerH) ? Number(containerH) : Number(doc?.meta.height ?? 0);
    const px = Number((l as any).position?.x ?? 0);
    const py = Number((l as any).position?.y ?? 0);
    const w = Number((l as any).size?.w ?? 0);
    const h = Number((l as any).size?.h ?? 0);
    const ax = Number((a as any)?.x ?? 0.5);
    const ay = Number((a as any)?.y ?? 0.5);
    const left = px - ax * w;
    const top = useYUp ? (CH - (py + (1 - ay) * h)) : (py - ay * h);
    return {
      left: Number.isFinite(left) ? left : 0,
      top: Number.isFinite(top) ? top : 0,
    };
  };
  const cssToPosition = (cssLeft: number, cssTop: number, l: AnyLayer, containerH: number, useYUp: boolean) => {
    const a = getAnchor(l);
    const CH = Number.isFinite(containerH) ? Number(containerH) : Number(doc?.meta.height ?? 0);
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

  const findPathTo = (id: string): AnyLayer[] | null => {
    const stack: AnyLayer[] = [];
    const dfs = (arr: AnyLayer[]): AnyLayer[] | null => {
      for (const n of arr) {
        stack.push(n);
        if (n.id === id) return [...stack];
        if ((n as any).type === 'group' && Array.isArray((n as any).children)) {
          const p = dfs((n as GroupLayer).children);
          if (p) return p;
        }
        stack.pop();
      }
      return null;
    };
    return dfs(renderedLayers || []);
  };

  const getRenderContextFor = (id: string): { containerH: number; useYUp: boolean } => {
    let useYUp = (getRootFlip() === 0);
    let containerH = doc?.meta.height ?? 0;
    const path = findPathTo(id);
    if (!path || path.length === 0) return { containerH, useYUp };
    for (let i = 0; i < path.length - 1; i++) {
      const node = path[i];
      if ((node as any).type === 'group') {
        const g = node as GroupLayer;
        useYUp = (typeof (g as any).geometryFlipped === 'number') ? (((g as any).geometryFlipped as 0 | 1) === 0) : useYUp;
        containerH = g.size.h;
      }
    }
    return { containerH, useYUp };
  };

  const computeAbsoluteLTFor = (id: string): { left: number; top: number; useYUp: boolean; containerH: number } => {
    const path = findPathTo(id);
    let useYUp = (getRootFlip() === 0);
    let containerH = doc?.meta.height ?? 0;
    if (!path || path.length === 0) return { left: 0, top: 0, useYUp, containerH };
    let left = 0;
    let top = 0;
    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      const lt = computeCssLT(node, containerH, useYUp);
      left += lt.left;
      top += lt.top;
      if (i < path.length - 1 && (node as any).type === 'group') {
        const g = node as GroupLayer;
        useYUp = (typeof (g as any).geometryFlipped === 'number') ? (((g as any).geometryFlipped as 0 | 1) === 0) : useYUp;
        containerH = g.size.h;
      }
    }
    return { left, top, useYUp, containerH };
  };

  const getParentAbsContextFor = (id: string): { left: number; top: number; useYUp: boolean; containerH: number } => {
    const path = findPathTo(id);
    let useYUp = (getRootFlip() === 0);
    let containerH = doc?.meta.height ?? 0;
    if (!path || path.length < 2) return { left: 0, top: 0, useYUp, containerH };
    let left = 0;
    let top = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const node = path[i];
      const lt = computeCssLT(node, containerH, useYUp);
      left += lt.left;
      top += lt.top;
      if ((node as any).type === 'group') {
        const g = node as GroupLayer;
        useYUp = (typeof (g as any).geometryFlipped === 'number') ? (((g as any).geometryFlipped as 0 | 1) === 0) : useYUp;
        containerH = g.size.h;
      }
    }
    return { left, top, useYUp, containerH };
  };

  const findSiblingsOf = (layers: AnyLayer[], id: string): { siblings: AnyLayer[]; index: number } | null => {
    const walk = (arr: AnyLayer[]): { siblings: AnyLayer[]; index: number } | null => {
      const idx = arr.findIndex((l) => l.id === id);
      if (idx >= 0) return { siblings: arr, index: idx };
      for (const l of arr) {
        if ((l as any).type === 'group' && Array.isArray((l as any).children)) {
          const res = walk((l as any).children as AnyLayer[]);
          if (res) return res;
        }
      }
      return null;
    };
    return walk(layers);
  };

  const startDrag = (l: AnyLayer, e: ReactMouseEvent, containerH?: number, useYUp?: boolean) => {
    if (e.shiftKey || e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    const canvasH = containerH ?? (docRef.current?.meta.height ?? 0);
    const yUp = useYUp ?? (getRootFlip() === 0);
    const startLT = computeCssLT(l, canvasH, yUp);
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
        
        const parentAbs = getParentAbsContextFor(d.id);
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
            const otherAbs = computeAbsoluteLTFor(L.id);
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
            if (dist <= th && dist < bestDist) { best = t; bestDist = dist; guide = g; }
          }
          return { value: best, guide };
        };
        const nx = nearestPair(cssLeft, xPairs);
        const ny = nearestPair(cssTop, yPairs);
        cssLeft = nx.value; cssTop = ny.value;
        setSnapState({ x: nx.guide, y: ny.guide });
      } else {
        setSnapState({ x: null, y: null });
      }
      const pos = cssToPosition(cssLeft, cssTop, (renderedLayers.find(r=>r.id===d.id) as AnyLayer) || (l as AnyLayer), h, d.yUp as boolean);
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
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp as any);
    window.addEventListener("touchmove", onTouchMove as any, { passive: false } as any);
    window.addEventListener("touchend", onUp as any, { passive: false } as any);
  };

  // moved helpers above

  const hexToRgba = (hex?: string, alpha?: number): string | undefined => {
    if (!hex) return undefined;
    const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (!m) return hex;
    const h = m[1].length === 6 ? m[1] : m[1].slice(0, 6);
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = (typeof alpha === 'number') ? Math.max(0, Math.min(1, alpha)) : 1;
    if (a >= 1) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  const bgStyleFor = (l: AnyLayer): React.CSSProperties => {
    const hex = (l as any).backgroundColor as string | undefined;
    const a = (l as any).backgroundOpacity as number | undefined;
    const css = hexToRgba(hex, a);
    return css ? { background: css } : {};
  };

  const renderLayer = (
    l: AnyLayer,
    containerH: number = (doc?.meta.height ?? 0),
    useYUp: boolean = getRootFlip() === 0,
    siblings: AnyLayer[] = renderedLayers,
    assets?: Record<string, { dataURL?: string }>,
    disableHitTesting: boolean = false
  ): ReactNode => {
    const { left, top } = computeCssLT(l, containerH, useYUp);
    const a = getAnchor(l);
    const transformOriginY = useYUp ? (1 - a.y) * 100 : a.y * 100;
    const isWrappedContent = (l as any).__wrappedContent === true || disableHitTesting === true;
    const borderStyle: React.CSSProperties = (typeof (l as any).borderWidth === 'number' && (l as any).borderWidth > 0)
      ? { border: `${(l as any).borderWidth}px solid ${(l as any).borderColor || '#000000'}` }
      : {};
    const common: React.CSSProperties = {
      position: "absolute",
      left,
      top,
      width: l.size.w,
      height: l.size.h,
      transform: `rotateX(${-((l as any).rotationX ?? 0)}deg) rotateY(${-((l as any).rotationY ?? 0)}deg) rotate(${-(l.rotation ?? 0)}deg)`,
      transformOrigin: `${a.x * 100}% ${transformOriginY}%`,
      backfaceVisibility: "visible",
      display: l.visible === false ? "none" : undefined,
      opacity: typeof (l as any).opacity === 'number' ? Math.max(0, Math.min(1, (l as any).opacity)) : undefined,
      cursor: "move",
      pointerEvents: isWrappedContent ? 'none' : undefined,
      ...(borderStyle || {}),
      ...(typeof (l as any).cornerRadius === 'number' ? { borderRadius: (l as any).cornerRadius } : {}),
    };

    if (l.type === "text") {
      const t = l as any;
      const cssAlign = (t.align === 'justified') ? 'justify' : (t.align || 'left');
      const whiteSpace: React.CSSProperties['whiteSpace'] = (t.wrapped ?? 1) === 1 ? 'normal' : 'nowrap';
      return (
        <LayerContextMenu key={l.id} layer={l} siblings={siblings}>
          <div
            style={{ ...common, ...bgStyleFor(l), color: l.color, fontSize: l.fontSize, textAlign: cssAlign as any, whiteSpace }}
            onMouseDown={isWrappedContent ? undefined : (e) => startDrag(l, e, containerH, useYUp)}
            onTouchStart={isWrappedContent ? undefined : ((e) => {
              if (e.touches.length === 1) {
                e.preventDefault();
                startDrag(l, touchToMouseLike(e.touches[0]), containerH, useYUp);
              }
            })}
          >
            {l.text}
          </div>
        </LayerContextMenu>
      );
    }
    if (l.type === "image") {
      const assetsMap = assets || (current?.assets || {});
      const imgAsset = assetsMap[l.id];
      const previewSrc = imgAsset?.dataURL || l.src;
      return (
        <LayerContextMenu key={l.id} layer={l} siblings={siblings}>
          <img
            src={previewSrc}
            alt={l.name}
            style={{
              ...common,
              ...bgStyleFor(l),
              objectFit: "fill" as React.CSSProperties["objectFit"],
              maxWidth: "none",
              maxHeight: "none",
            }}
            draggable={false}
            onMouseDown={isWrappedContent ? undefined : (e) => startDrag(l, e, containerH, useYUp)}
            onTouchStart={isWrappedContent ? undefined : ((e) => {
              if (e.touches.length === 1) {
                e.preventDefault();
                startDrag(l, touchToMouseLike(e.touches[0]), containerH, useYUp);
              }
            })}
          />
        </LayerContextMenu>
      );
    }
    if (l.type === "video") {
      const v = l as any;
      const frameIndex = v.currentFrameIndex ?? 0;
      const frameAssetId = `${l.id}_frame_${frameIndex}`;
      const assetsMap = assets || (current?.assets || {});
      const frameAsset = assetsMap[frameAssetId];
      const previewSrc = frameAsset?.dataURL || "";
      return (
        <LayerContextMenu key={l.id} layer={l} siblings={siblings}>
          <img
            src={previewSrc}
            alt={l.name}
            style={{
              ...common,
              ...bgStyleFor(l),
              objectFit: "fill" as React.CSSProperties["objectFit"],
              maxWidth: "none",
              maxHeight: "none",
            }}
            draggable={false}
            onMouseDown={isWrappedContent ? undefined : (e) => startDrag(l, e, containerH, useYUp)}
            onTouchStart={isWrappedContent ? undefined : ((e) => {
              if (e.touches.length === 1) {
                e.preventDefault();
                startDrag(l, touchToMouseLike(e.touches[0]), containerH, useYUp);
              }
            })}
          />
        </LayerContextMenu>
      );
    }
    if (l.type === "gradient") {
      const grad = l as any;
      const gradType = grad.gradientType || 'axial';
      const startX = (grad.startPoint?.x ?? 0) * 100;
      const startY = (grad.startPoint?.y ?? 0) * 100;
      const endX = (grad.endPoint?.x ?? 1) * 100;
      const endY = (grad.endPoint?.y ?? 1) * 100;
      
      const colors = (grad.colors || []).map((c: any) => {
        const opacity = c.opacity ?? 1;
        const hex = c.color || '#000000';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }).join(', ');
      
      let background = '';
      
      const isSamePoint = Math.abs(startX - endX) < 0.01 && Math.abs(startY - endY) < 0.01;
      
      if (isSamePoint) {
        const firstColor = (grad.colors || [])[0];
        if (firstColor) {
          const opacity = firstColor.opacity ?? 1;
          const hex = firstColor.color || '#000000';
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
      } else if (gradType === 'axial') {
        const dx = endX - startX;
        const dy = -(endY - startY);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        background = `linear-gradient(${angle}deg, ${colors})`;
      } else if (gradType === 'radial') {
        background = `radial-gradient(circle at ${startX}% ${100 - startY}%, ${colors})`;
      } else if (gradType === 'conic') {
        const dx = endX - startX;
        const dy = -(endY - startY);
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        background = `conic-gradient(from ${angle}rad at ${startX}% ${100 - startY}%, ${colors})`;
      }
      
      return (
        <LayerContextMenu key={l.id} layer={l} siblings={siblings}>
          <div
            style={{ ...common, background }}
            onMouseDown={isWrappedContent ? undefined : (e) => startDrag(l, e, containerH, useYUp)}
            onTouchStart={isWrappedContent ? undefined : ((e) => {
              if (e.touches.length === 1) {
                e.preventDefault();
                startDrag(l, touchToMouseLike(e.touches[0]), containerH, useYUp);
              }
            })}
          />
        </LayerContextMenu>
      );
    }
    if (l.type === "shape") {
      const s = l as ShapeLayer;
      const corner = (l as any).cornerRadius as number | undefined;
      const legacy = s.radius;
      const borderRadius = s.shape === "circle" ? 9999 : ((corner ?? legacy ?? 0));
      const style: React.CSSProperties = (l as any).backgroundColor
        ? { ...common, ...bgStyleFor(l), borderRadius }
        : { ...common, background: s.fill, borderRadius };
      return (
        <LayerContextMenu key={l.id} layer={l} siblings={siblings}>
          <div
            style={style}
            onMouseDown={isWrappedContent ? undefined : (e) => startDrag(l, e, containerH, useYUp)}
            onTouchStart={isWrappedContent ? undefined : ((e) => {
              if (e.touches.length === 1) {
                e.preventDefault();
                startDrag(l, touchToMouseLike(e.touches[0]), containerH, useYUp);
              }
            })}
          />
        </LayerContextMenu>
      );
    }
    if (l.type === "emitter") {
      const e = l as EmitterLayer;
      const style: React.CSSProperties = {
        ...common,
        ...bgStyleFor(l),
        ...((e as any).masksToBounds ? { overflow: 'hidden' } : {}),
      };
      return (
        <LayerContextMenu key={l.id} layer={l} siblings={siblings}>
          <div
            style={style}
            onMouseDown={isWrappedContent ? undefined : (e) => startDrag(l, e, containerH, useYUp)}
            onTouchStart={isWrappedContent ? undefined : ((e) => {
              if (e.touches.length === 1) {
                e.preventDefault();
                startDrag(l, touchToMouseLike(e.touches[0]), containerH, useYUp);
              }
            })}
          >
            <EmitterCanvas
              layer={e}
              paused={!isAnimationPlaying}
              assets={assets}
              left={Number(style.left) || 0}
              top={Number(style.top) || 0}
              docWidth={doc?.meta.width || 0}
              docHeight={doc?.meta.height || 0}
            />
          </div>
        </LayerContextMenu>
      );
    }
    // group
    const g = l as GroupLayer;
    const nextUseYUp = (typeof (g as any).geometryFlipped === 'number')
      ? (((g as any).geometryFlipped as 0 | 1) === 0)
      : useYUp;
    const parentDisplay = (g as any)._displayType as string | undefined;
    return (
      <LayerContextMenu key={g.id} layer={g} siblings={siblings}>
        <div style={{ ...common, ...bgStyleFor(g), ...((((g as any).masksToBounds ?? 0) === 1) ? { overflow: 'hidden' as const } : {}) }}
             onMouseDown={(e) => startDrag(g, e, containerH, useYUp)}
             onTouchStart={(e) => {
               if (e.touches.length === 1) {
                 e.preventDefault();
                 startDrag(g, touchToMouseLike(e.touches[0]), containerH, useYUp);
               }
             }}
        >
          {parentDisplay === 'text' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                color: (g as any).color,
                fontSize: (g as any).fontSize,
                textAlign: (((g as any).align === 'justified') ? 'justify' : ((g as any).align || 'left')) as any,
                whiteSpace: (((g as any).wrapped ?? 1) === 1 ? 'normal' : 'nowrap') as any,
                pointerEvents: 'none',
              }}
            >
              {(g as any).text}
            </div>
          )}
          {parentDisplay === 'image' && (() => {
            const assetsMap = assets || (current?.assets || {});
            const imgAsset = assetsMap[g.id];
            const previewSrc = imgAsset?.dataURL || (g as any).src || '';
            return (
              <img
                src={previewSrc}
                alt={(g as any).name}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />
            );
          })()}
          {parentDisplay === 'gradient' && (() => {
            const grad: any = g;
            const gradType = grad.gradientType || 'axial';
            const startX = (grad.startPoint?.x ?? 0) * 100;
            const startY = (grad.startPoint?.y ?? 0) * 100;
            const endX = (grad.endPoint?.x ?? 1) * 100;
            const endY = (grad.endPoint?.y ?? 1) * 100;
            const colors = (grad.colors || []).map((c: any) => {
              const opacity = c.opacity ?? 1;
              const hex = c.color || '#000000';
              const r = parseInt(hex.slice(1, 3), 16);
              const gC = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${gC}, ${b}, ${opacity})`;
            }).join(', ');
            let background = '';
            const isSamePoint = Math.abs(startX - endX) < 0.01 && Math.abs(startY - endY) < 0.01;
            if (isSamePoint) {
              const firstColor = (grad.colors || [])[0];
              if (firstColor) {
                const opacity = firstColor.opacity ?? 1;
                const hex = firstColor.color || '#000000';
                const r = parseInt(hex.slice(1, 3), 16);
                const gC = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                background = `rgba(${r}, ${gC}, ${b}, ${opacity})`;
              }
            } else if (gradType === 'axial') {
              const dx = endX - startX;
              const dy = -(endY - startY);
              const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
              background = `linear-gradient(${angle}deg, ${colors})`;
            } else if (gradType === 'radial') {
              background = `radial-gradient(circle at ${startX}% ${100 - startY}%, ${colors})`;
            } else if (gradType === 'conic') {
              const dx = endX - startX;
              const dy = -(endY - startY);
              const angle = Math.atan2(dy, dx) + Math.PI / 2;
              background = `conic-gradient(from ${angle}rad at ${startX}% ${100 - startY}%, ${colors})`;
            }
            return (
              <div
                style={{ position: 'absolute', inset: 0, background, pointerEvents: 'none' }}
              />
            );
          })()}
          {g.children.map((c) => {
            const childType = (c as any).type as string | undefined;
            const disable = !!parentDisplay && !!childType && parentDisplay === childType;
            return renderLayer(c, g.size.h, nextUseYUp, g.children, assets, disable);
          })}
        </div>
      </LayerContextMenu>
    );
  };

  const findById = (layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined => {
    if (!id) return undefined;
    for (const l of layers) {
      if (l.id === id) return l;
      if (l.type === "group") {
        const found = findById((l as GroupLayer).children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const clientToWorld = (clientX: number, clientY: number) => {
    if (!ref.current) return { x: 0, y: 0 };
    const rect = ref.current.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const worldX = (cx - (baseOffsetX + pan.x)) / scale;
    const worldY = (cy - (baseOffsetY + pan.y)) / scale;
    return { x: worldX, y: worldY };
  };

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

  const touchToMouseLike = (t: any) => ({
    clientX: t.clientX,
    clientY: t.clientY,
    button: 0,
    preventDefault() {},
    stopPropagation() {},
  }) as any;

  const touchGestureRef = useRef<
    | {
        startUserScale: number;
        startPanX: number;
        startPanY: number;
        startDist: number;
        startCenterX: number;
        startCenterY: number;
      }
    | null
  >(null);

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

  const beginResize = (l: AnyLayer, handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw", e: ReactMouseEvent) => {
    if (e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    const ctx = getRenderContextFor(l.id);
    const canvasH = ctx.containerH;
    const yUp = ctx.useYUp;
    const startLT = computeCssLT(l, canvasH, yUp);
    const a = getAnchor(l);
    const parentCtx = getParentAbsContextFor(l.id);
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
      const mouseWorld = clientToWorld(ev.clientX, ev.clientY);
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
            const ltAbs = computeAbsoluteLTFor(L.id);
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

  const beginRotate = (l: AnyLayer, e: ReactMouseEvent) => {
    if (e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    const abs = computeAbsoluteLTFor(l.id);
    const canvasH = docRef.current?.meta.height ?? 0;
    const yUp = abs.useYUp;
    const lt = { left: abs.left, top: abs.top };
    const a = getAnchor(l);
    const centerX = lt.left + a.x * l.size.w;
    const centerY = lt.top + (yUp ? (1 - a.y) * l.size.h : a.y * l.size.h);
    const world = clientToWorld(e.clientX, e.clientY);
    const angle0 = Math.atan2(world.y - centerY, world.x - centerX) * 180 / Math.PI;
    rotationDragRef.current = { id: l.id, centerX, centerY, startAngle: angle0 + (l.rotation ?? 0), canvasH, yUp, lastRot: l.rotation ?? 0 };
    const onMove = (ev: MouseEvent) => {
      const d = rotationDragRef.current;
      if (!d) return;
      const wpt = clientToWorld(ev.clientX, ev.clientY);
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

  const renderSelectionOverlay = (l: AnyLayer) => {
  const abs = computeAbsoluteLTFor(l.id);
  const a = getAnchor(l);
  const transformOriginY = abs.useYUp ? (1 - a.y) * 100 : a.y * 100;
  const inv = 1 / Math.max(0.0001, scale);
  const px = (n: number) => Math.max(0, n * inv);
  const rot = (l.rotation ?? 0) as number;
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
    width: l.size.w,
    height: l.size.h,
    transform: `rotateX(${-((l as any).rotationX ?? 0)}deg) rotateY(${-((l as any).rotationY ?? 0)}deg) rotate(${-(l.rotation ?? 0)}deg)`,
    transformOrigin: `${a.x * 100}% ${transformOriginY}%`,
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
  if (l.type === 'text') {
    const wrapped = (((l as any).wrapped ?? 1) as number) === 1;
    if (wrapped) {
      handles = [
        { key: "e", x: "100%", y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(l, "e", e) },
        { key: "w", x: 0, y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(l, "w", e) },
      ];
    } else {
      handles = [];
    }
  } else {
    handles = [
      { key: "nw", x: 0, y: 0, cursor: cornerCursor('nw'), h: (e: any) => beginResize(l, "nw", e) },
      { key: "n", x: "50%", y: 0, cursor: edgeCursor('y'), h: (e: any) => beginResize(l, "n", e) },
      { key: "ne", x: "100%", y: 0, cursor: cornerCursor('ne'), h: (e: any) => beginResize(l, "ne", e) },
      { key: "e", x: "100%", y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(l, "e", e) },
      { key: "se", x: "100%", y: "100%", cursor: cornerCursor('se'), h: (e: any) => beginResize(l, "se", e) },
      { key: "s", x: "50%", y: "100%", cursor: edgeCursor('y'), h: (e: any) => beginResize(l, "s", e) },
      { key: "sw", x: 0, y: "100%", cursor: cornerCursor('sw'), h: (e: any) => beginResize(l, "sw", e) },
      { key: "w", x: 0, y: "50%", cursor: edgeCursor('x'), h: (e: any) => beginResize(l, "w", e) },
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
  // showBoth removed: no overlay rendering of the non-active CA
  return (
    <>
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
          onMouseDown={(e) => beginRotate(l, e)}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.preventDefault();
              beginRotate(l, touchToMouseLike(e.touches[0]));
            }
          }}
        />
        {/* Anchor point indicator */}
        {showAnchorPoint && (
          <div
            style={{
              position: "absolute",
              left: `${a.x * 100}%`,
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
    </>
  );
};

  return (
    <Card
      ref={ref}
      className={`relative w-full h-full overflow-hidden p-0 ${isPanning ? 'cursor-grabbing' : ''}`}
      style={{ touchAction: 'none' }}
      data-tour-id="canvas"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={async (e) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []);
        for (const file of files) {
          if (/^image\//i.test(file.type)) {
            await addImageLayerFromFile(file);
          }
        }
      }}
      onWheel={(e) => {
        if (!ref.current) return;
        // pinch-to-zoom via ctrl+wheel, or shift+scroll
        if (e.ctrlKey || e.shiftKey) {
          e.preventDefault();
          const rect = ref.current.getBoundingClientRect();
          const clientX = e.clientX - rect.left;
          const clientY = e.clientY - rect.top;
          const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
          const worldY = (clientY - (baseOffsetY + pan.y)) / scale;
          const factor = Math.exp(-e.deltaY * 0.001);
          const nextUserScale = Math.min(5, Math.max(0.2, userScale * factor));
          const nextScale = fitScale * nextUserScale;
          const nextPanX = clientX - worldX * nextScale - baseOffsetX;
          const nextPanY = clientY - worldY * nextScale - baseOffsetY;
          setUserScale(nextUserScale);
          setPan({ x: nextPanX, y: nextPanY });
        }
      }}
      onTouchStart={(e) => {
        if (!ref.current) return;
        if (e.touches.length >= 2) {
          e.preventDefault();
          const rect = ref.current.getBoundingClientRect();
          const [t1, t2] = [e.touches[0], e.touches[1]];
          const cx = (t1.clientX + t2.clientX) / 2 - rect.left;
          const cy = (t1.clientY + t2.clientY) / 2 - rect.top;
          const dx = t2.clientX - t1.clientX;
          const dy = t2.clientY - t1.clientY;
          const dist = Math.hypot(dx, dy);
          touchGestureRef.current = {
            startUserScale: userScale,
            startPanX: pan.x,
            startPanY: pan.y,
            startDist: dist,
            startCenterX: cx,
            startCenterY: cy,
          };
        }
      }}
      onTouchMove={(e) => {
        const g = touchGestureRef.current;
        if (!ref.current || !g) return;
        if (e.touches.length >= 2) {
          e.preventDefault();
          const rect = ref.current.getBoundingClientRect();
          const [t1, t2] = [e.touches[0], e.touches[1]];
          const cx = (t1.clientX + t2.clientX) / 2 - rect.left;
          const cy = (t1.clientY + t2.clientY) / 2 - rect.top;
          const dx = t2.clientX - t1.clientX;
          const dy = t2.clientY - t1.clientY;
          const dist = Math.hypot(dx, dy);
          const factor = dist / Math.max(1, g.startDist);
          const nextUserScale = Math.min(5, Math.max(0.2, g.startUserScale * factor));
          const nextScale = fitScale * nextUserScale;
          const worldX = (g.startCenterX - (baseOffsetX + g.startPanX)) / (fitScale * g.startUserScale);
          const worldY = (g.startCenterY - (baseOffsetY + g.startPanY)) / (fitScale * g.startUserScale);
          const nextPanX = cx - worldX * nextScale - baseOffsetX;
          const nextPanY = cy - worldY * nextScale - baseOffsetY;
          setUserScale(nextUserScale);
          setPan({ x: nextPanX, y: nextPanY });
        }
      }}
      onTouchEnd={() => {
        touchGestureRef.current = null;
      }}
      onTouchCancel={() => {
        touchGestureRef.current = null;
      }}
      onMouseDown={(e) => {
        // Middle mouse button or Shift + drag to pan around
        if (!ref.current) return;
        if (e.shiftKey || e.button === 1) {
          e.preventDefault();
          const startClientX = e.clientX;
          const startClientY = e.clientY;
          panDragRef.current = {
            startClientX,
            startClientY,
            startPanX: pan.x,
            startPanY: pan.y,
          };
          setIsPanning(true);
          const onMove = (ev: MouseEvent) => {
            const d = panDragRef.current;
            if (!d) return;
            const dx = ev.clientX - d.startClientX;
            const dy = ev.clientY - d.startClientY;
            setPan({ x: d.startPanX + dx, y: d.startPanY + dy });
          };
          const onUp = () => {
            panDragRef.current = null;
            setIsPanning(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          return;
        }
        selectLayer(null);
      }}
      onKeyDown={() => {  }}
    >
      <div
        className="absolute inset-0 dark:hidden cursor-[inherit]"
        style={{ background: "repeating-conic-gradient(#f8fafc 0% 25%, #e5e7eb 0% 50%) 50% / 20px 20px" }}
      />
      <div
        className="absolute inset-0 hidden dark:block cursor-[inherit]"
        style={{ background: "repeating-conic-gradient(#0b1220 0% 25%, #1f2937 0% 50%) 50% / 20px 20px" }}
      />
      <div
        className="absolute"
        style={{
          width: doc?.meta.width,
          height: doc?.meta.height,
          background: doc?.meta.background ?? "#f3f4f6",
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
          borderRadius: 0,
          overflow: clipToCanvas ? "hidden" : "visible",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.08)",
        }}
        onMouseDown={(e) => {
          if (e.shiftKey || e.button === 1) return;

          selectLayer(null);
        }}
      >
        {currentKey === 'floating' && showBackground ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {renderedLayers.slice(0, backgroundLayers.length).map((l) => renderLayer(l, undefined as any, undefined as any, undefined as any, other?.assets))}
          </div>
        ) : currentKey === 'background' ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {renderedLayers.map((l) => renderLayer(l, undefined as any, undefined as any, undefined as any, current?.assets))}
          </div>
        ) : null}
        {showClockOverlay && (() => {
          const w = doc?.meta.width ?? 0;
          const h = doc?.meta.height ?? 0;
          const targetRatio = 1170 / 2532;
          const currentRatio = w / h;
          const isMatchingAspectRatio = Math.abs(currentRatio - targetRatio) < 0.01;
          
          if (isMatchingAspectRatio) {
            return (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundImage: 'url(/clock.png)',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 500,
                }}
              />
            );
          }
          return null;
        })()}
        {currentKey === 'floating' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1000 }}>
            {showBackground 
              ? renderedLayers.slice(backgroundLayers.length).map((l) => renderLayer(l, undefined as any, undefined as any, undefined as any, current?.assets))
              : renderedLayers.map((l) => renderLayer(l, undefined as any, undefined as any, undefined as any, current?.assets))
            }
          </div>
        )}
        {/* Edge guide overlay */}
        {showEdgeGuide && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              border: '3px dotted #ffffff',
              borderRadius: 0,
              mixBlendMode: 'difference',
            }}
          />
        )}
        {(() => {
          const sel = findById(renderedLayers, current?.selectedId ?? null);
          return sel ? renderSelectionOverlay(sel) : null;
        })()}
        {(() => {
          const w = doc?.meta.width ?? 0;
          const h = doc?.meta.height ?? 0;
          if (!w || !h) return null;
          const sx = snapState.x;
          const sy = snapState.y;
          if (sx == null && sy == null) return null;
          const lineColor = 'rgba(59,130,246,0.9)';
          const lineShadow = '0 0 0 1px rgba(59,130,246,0.25)';
          const guides: React.ReactNode[] = [];
          if (typeof sx === 'number') {
            guides.push(<div key="v" style={{ position: 'absolute', left: sx, top: 0, bottom: 0, width: 2, background: lineColor, boxShadow: lineShadow, transform: 'translateX(-1px)', zIndex: 1000, pointerEvents: 'none' }} />);
          }
          if (typeof sy === 'number') {
            guides.push(<div key="h" style={{ position: 'absolute', top: sy, left: 0, right: 0, height: 2, background: lineColor, boxShadow: lineShadow, transform: 'translateY(-1px)', zIndex: 1000, pointerEvents: 'none' }} />);
          }
          return <>{guides}</>;
        })()}
      </div>

      {/* Preview toggles (bottom-right) */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2 bg-white/80 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 shadow-sm">
        {(() => {
          const w = doc?.meta.width ?? 0;
          const h = doc?.meta.height ?? 0;
          const targetRatio = 1170 / 2532;
          const currentRatio = w / h;
          const isMatchingAspectRatio = Math.abs(currentRatio - targetRatio) < 0.01;
          
          if (isMatchingAspectRatio) {
            return (
              <Button
                type="button"
                size="icon"
                variant={showClockOverlay ? "default" : "outline"}
                aria-pressed={showClockOverlay}
                aria-label="Toggle clock overlay"
                title="Clock"
                onClick={() => setShowClockOverlay((v: boolean) => !v)}
                className={`h-8 w-8 ${showClockOverlay ? '' : 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'}`}
              >
                <Clock className="h-4 w-4" />
              </Button>
            );
          }
          return null;
        })()}
        <Button
          type="button"
          size="icon"
          variant={showEdgeGuide ? "default" : "outline"}
          aria-pressed={showEdgeGuide}
          aria-label="Toggle edge guide"
          title="Edge guide"
          onClick={() => setShowEdgeGuide((v: boolean) => !v)}
          className={`h-8 w-8 ${showEdgeGuide ? '' : 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'}`}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={clipToCanvas ? "default" : "outline"}
          aria-pressed={clipToCanvas}
          aria-label="Toggle clip to canvas"
          title="Clip to canvas"
          onClick={() => setClipToCanvas((v: boolean) => !v)}
          className={`h-8 w-8 ${clipToCanvas ? '' : 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'}`}
        >
          <Crop className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          aria-label="Zoom in"
          onClick={() => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const clientX = rect.width / 2;
            const clientY = rect.height / 2;
            const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
            const worldY = (clientY - (baseOffsetY + pan.y)) / scale;
            const nextUserScale = Math.min(5, userScale * 1.1);
            const nextScale = fitScale * nextUserScale;
            const nextPanX = clientX - worldX * nextScale - baseOffsetX;
            const nextPanY = clientY - worldY * nextScale - baseOffsetY;
            setUserScale(nextUserScale);
            setPan({ x: nextPanX, y: nextPanY });
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Zoom out"
          onClick={() => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const clientX = rect.width / 2;
            const clientY = rect.height / 2;
            const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
            const worldY = (clientY - (baseOffsetY + pan.y)) / scale;
            const nextUserScale = Math.max(0.2, userScale / 1.1);
            const nextScale = fitScale * nextUserScale;
            const nextPanX = clientX - worldX * nextScale - baseOffsetX;
            const nextPanY = clientY - worldY * nextScale - baseOffsetY;
            setUserScale(nextUserScale);
            setPan({ x: nextPanX, y: nextPanY });
          }}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Re-center"
          title="Re-center"
          onClick={() => {
            setUserScale(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>

      {/* Playback controls - visible only if any animation is enabled */}
      {hasAnyEnabledAnimation && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/80 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 shadow-sm">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsAnimationPlaying((p: boolean) => !p)}
          >
            {isAnimationPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setTimeSec(0); lastTsRef.current = null; }}
          >
            Restart
          </Button>
          <div className="text-xs tabular-nums px-2">{`${timeSec.toFixed(2)}s`}</div>
        </div>
      )}
    </Card>
  );
}
