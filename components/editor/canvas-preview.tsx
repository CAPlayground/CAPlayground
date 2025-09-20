"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Crosshair } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import { useEditor } from "./editor-context";
import type { AnyLayer, GroupLayer, ShapeLayer } from "@/lib/ca/types";

export function CanvasPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { doc, updateLayer, updateLayerTransient, selectLayer, copySelectedLayer, pasteFromClipboard, addImageLayerFromBlob, addImageLayerFromFile, isAnimationPlaying, setIsAnimationPlaying, animatedLayers, setAnimatedLayers } = useEditor();
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

  // clipboard copy/paste and paste
  useEffect(() => {
    const isImageUrl = (txt: string) => /^(https?:\/\/).+\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(txt.trim());
    const isDataUrl = (txt: string) => /^data:image\//i.test(txt.trim());
    const getFilenameFromUrl = (u: string) => {
      try {
        const url = new URL(u);
        const base = (url.pathname.split('/').pop() || 'image').split('?')[0];
        return base || 'image.png';
      } catch { return 'image.png'; }
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
                await addImageLayerFromBlob(blob);
                return;
              }
              const txtType = types.find((t: string) => /text\/(uri-list|plain)/i.test(t));
              if (txtType) {
                try {
                  const t = await item.getType(txtType);
                  const text = await t.text();
                  const line = (text || '').trim().split(/\r?\n/).find(Boolean) || '';
                  if (isDataUrl(line)) {
                    const resp = await fetch(line);
                    const blob = await resp.blob();
                    await addImageLayerFromBlob(blob);
                    return;
                  }
                  if (isImageUrl(line)) {
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
              try { const resp = await fetch(firstLine); const blob = await resp.blob(); await addImageLayerFromBlob(blob); return; } catch {}
            }
            if (isImageUrl(firstLine)) {
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
        if (blob) await addImageLayerFromBlob(blob);
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
          try { e.preventDefault(); const resp = await fetch(candidate); const blob = await resp.blob(); await addImageLayerFromBlob(blob); return; } catch {}
        }
        if (/^file:\/\//i.test(candidate)) {
        } else if (isImageUrl(candidate)) {
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
    const list = overrides[state] || [];
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
      } else if ((kp === 'opacity' || kp === 'cornerRadius' || kp === 'borderWidth' || kp === 'fontSize') && typeof v === 'number') {
        (target as any)[kp] = v as any;
      } else if ((kp === 'backgroundColor' || kp === 'borderColor' || kp === 'color') && typeof v === 'string') {
        (target as any)[kp] = v as any;
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

  const [renderedLayers, setRenderedLayers] = useState<AnyLayer[]>(appliedLayers);
  useEffect(() => { setRenderedLayers(appliedLayers); }, []);

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
    if (keyPath === 'opacity') return (l as any).opacity ?? 1;
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
    const autorev = Number(anim.autoreverses ?? 0) === 1;
    let localT = t;
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
    }
  };

  useEffect(() => {
    const frame = JSON.parse(JSON.stringify(appliedLayers)) as AnyLayer[];
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
  }, [timeSec, appliedLayers, setAnimatedLayers]);

  const hasAnyEnabledAnimation = useMemo(() => {
    const check = (arr: AnyLayer[]): boolean => {
      for (const l of arr) {
        const anim: any = (l as any).animations;
        if (anim && anim.enabled) return true;
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
      setRenderedLayers(appliedLayers);
      return;
    }

    const provided = (current?.stateTransitions || []).filter(t =>
      (t.fromState === prevState || t.fromState === '*') &&
      (t.toState === nextState || t.toState === '*')
    );
    let transitions = provided;
    if (!provided.length) {
      const gens: Array<{ elements: { targetId: string; keyPath: string; animation?: { duration?: number } }[] }> = [];
      const addGen = (targetId: string, keyPath: string, duration = 0.8) => {
        if (!gens.length) gens.push({ elements: [] });
        gens[0].elements.push({ targetId, keyPath, animation: { duration } });
      };
      const ovs = current?.stateOverrides || {};
      const toList = ovs[nextState || ''] || [];
      const fromList = ovs[prevState || ''] || [];
      const keys = [
        'position.x','position.y','bounds.size.width','bounds.size.height','transform.rotation.z','opacity'
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
      transitions = gens as any;
    }

    if (!transitions.length) {
      setRenderedLayers(appliedLayers);
      prevStateRef.current = nextState;
      return;
    }

    const startMap = indexById(renderedLayers.length ? renderedLayers : appliedLayers);
    const endMap = indexById(appliedLayers);
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
        if (!['position.x', 'position.y', 'bounds.size.width', 'bounds.size.height', 'transform.rotation.z', 'opacity'].includes(key)) continue;
        const dur = Math.max(0.1, el.animation?.duration || 0.5);
        addTrack(el.targetId, key, dur);
      }
    }

    if (!tracks.length) {
      setRenderedLayers(appliedLayers);
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
  }, [current?.activeState, appliedLayers, current?.stateTransitions]);

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

  const startDrag = (l: AnyLayer, e: ReactMouseEvent) => {
    if (e.shiftKey || e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    draggingRef.current = {
      id: l.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: l.position.x,
      startY: l.position.y,
      w: l.size.w,
      h: l.size.h,
    };
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startClientX) / scale;
      const dy = (ev.clientY - d.startClientY) / scale;
      let x = d.startX + dx;
      let y = d.startY + dy;
      const w = docRef.current?.meta.width ?? 0;
      const h = docRef.current?.meta.height ?? 0;
      if (w > 0 && h > 0 && (snapEdgesEnabled || snapLayersEnabled)) {
        const th = SNAP_THRESHOLD;
        const xPairs: Array<[number, number]> = [];
        const yPairs: Array<[number, number]> = [];
        if (snapEdgesEnabled) {
          xPairs.push([0, 0], [(w - d.w) / 2, w / 2], [w - d.w, w]);
          yPairs.push([0, 0], [(h - d.h) / 2, h / 2], [h - d.h, h]);
        }
        if (snapLayersEnabled) {
          const others = (renderedLayers || []).filter((ol) => ol.id !== d.id);
          for (const ol of others) {
            const L = ol as any;
            const lx = L.position?.x ?? 0;
            const ly = L.position?.y ?? 0;
            const lw = L.size?.w ?? 0;
            const lh = L.size?.h ?? 0;
            const left = lx;
            const right = lx + lw;
            const cx = lx + lw / 2;
            const top = ly;
            const bottom = ly + lh;
            const cy = ly + lh / 2;
            xPairs.push(
              [left, left],
              [right, right],
              [right - d.w, right],
              [left - d.w, left],
              [cx - d.w / 2, cx],
            );
            yPairs.push(
              [top, top],
              [bottom, bottom],
              [bottom - d.h, bottom],
              [top - d.h, top],
              [cy - d.h / 2, cy],
            );
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
        const nx = nearestPair(x, xPairs);
        const ny = nearestPair(y, yPairs);
        x = nx.value; y = ny.value;
        setSnapState({ x: nx.guide, y: ny.guide });
      } else {
        setSnapState({ x: null, y: null });
      }
      updateLayerTransient(d.id, { position: { x, y } as any });
    };

    const onUp = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (d) {
        const dx = (ev.clientX - d.startClientX) / scale;
        const dy = (ev.clientY - d.startClientY) / scale;
        let x = d.startX + dx;
        let y = d.startY + dy;
        const w = docRef.current?.meta.width ?? 0;
        const h = docRef.current?.meta.height ?? 0;
        if (w > 0 && h > 0 && (snapEdgesEnabled || snapLayersEnabled)) {
          const th = SNAP_THRESHOLD;
          const xPairs: Array<[number, number]> = [];
          const yPairs: Array<[number, number]> = [];
          if (snapEdgesEnabled) {
            xPairs.push([0, 0], [(w - d.w) / 2, w / 2], [w - d.w, w]);
            yPairs.push([0, 0], [(h - d.h) / 2, h / 2], [h - d.h, h]);
          }
          if (snapLayersEnabled) {
            const others = (renderedLayers || []).filter((ol) => ol.id !== d.id);
            for (const ol of others) {
              const L = ol as any;
              const lx = L.position?.x ?? 0;
              const ly = L.position?.y ?? 0;
              const lw = L.size?.w ?? 0;
              const lh = L.size?.h ?? 0;
              const left = lx;
              const right = lx + lw;
              const cx = lx + lw / 2;
              const top = ly;
              const bottom = ly + lh;
              const cy = ly + lh / 2;
              xPairs.push([left, left],[right, right],[right - d.w, right],[left - d.w, left],[cx - d.w / 2, cx]);
              yPairs.push([top, top],[bottom, bottom],[bottom - d.h, bottom],[top - d.h, top],[cy - d.h / 2, cy]);
            }
          }
          const nearest = (val: number, pairs: Array<[number, number]>) => {
            let best = val;
            let bestDist = th + 1;
            for (const [t] of pairs) {
              const dist = Math.abs(val - t);
              if (dist <= th && dist < bestDist) { best = t; bestDist = dist; }
            }
            return best;
          };
          x = nearest(x, xPairs);
          y = nearest(y, yPairs);
        }
        updateLayer(d.id, { position: { x, y } as any });
      }
      draggingRef.current = null;
      document.body.style.userSelect = "";
      setSnapState({ x: null, y: null });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const renderLayer = (l: AnyLayer): ReactNode => {    const common: React.CSSProperties = {
      position: "absolute",
      left: l.position.x,
      top: l.position.y,
      width: l.size.w,
      height: l.size.h,
      transform: `perspective(800px) rotateX(${(l as any).rotationX ?? 0}deg) rotateY(${(l as any).rotationY ?? 0}deg) rotate(${l.rotation ?? 0}deg)`,
      transformOrigin: "50% 50%",
      backfaceVisibility: "visible",
      transformStyle: "preserve-3d",
      display: l.visible === false ? "none" : undefined,
      cursor: "move",
  };

    if (l.type === "text") {
      return (
        <div
          key={l.id}
          style={{ ...common, color: l.color, fontSize: l.fontSize, textAlign: l.align ?? "left" }}
          onMouseDown={(e) => startDrag(l, e)}
        >
          {l.text}
        </div>
      );
    }
    if (l.type === "image") {
      return (
        <img
          key={l.id}
          src={l.src}
          alt={l.name}
          style={{
            ...common,
            objectFit: "fill" as React.CSSProperties["objectFit"],
            maxWidth: "none",
            maxHeight: "none",
          }}
          draggable={false}
          onMouseDown={(e) => startDrag(l, e)}
        />
      );
    }
    if (l.type === "shape") {
      const s = l as ShapeLayer;
      const corner = (l as any).cornerRadius as number | undefined;
      const legacy = s.radius;
      const borderRadius = s.shape === "circle" ? 9999 : ((corner ?? legacy ?? 0));
      return (
        <div key={l.id} style={{ ...common, background: s.fill, borderRadius }} onMouseDown={(e) => startDrag(l, e)} />
      );
    }
    // group
    const g = l as GroupLayer;
    return (
      <div key={g.id} style={{ ...common, background: g.backgroundColor }} onMouseDown={(e) => startDrag(g, e)}>
        {g.children.map((c) => renderLayer(c))}
      </div>
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
        lastX: number;
        lastY: number;
        lastW: number;
        lastH: number;
      }
    | null
  >(null);

  const rotationDragRef = useRef<
    | {
        id: string;
        centerX: number;
        centerY: number;
        startAngle: number;
        lastRot: number;
      }
    | null
  >(null);

  const beginResize = (l: AnyLayer, handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw", e: ReactMouseEvent) => {
    if (e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    resizeDragRef.current = {
      id: l.id,
      handle,
      startX: l.position.x,
      startY: l.position.y,
      startW: l.size.w,
      startH: l.size.h,
      startClientX: e.clientX,
      startClientY: e.clientY,
      lastX: l.position.x,
      lastY: l.position.y,
      lastW: l.size.w,
      lastH: l.size.h,
    };
    const onMove = (ev: MouseEvent) => {
      const d = resizeDragRef.current;
      if (!d) return;
      const startWorld = clientToWorld(d.startClientX, d.startClientY);
      const currentWorld = clientToWorld(ev.clientX, ev.clientY);
      const dx = currentWorld.x - startWorld.x;
      const dy = currentWorld.y - startWorld.y;
      let x = d.startX;
      let y = d.startY;
      let w = d.startW;
      let h = d.startH;
      switch (d.handle) {
        case "e": w = Math.max(1, d.startW + dx); break;
        case "w": w = Math.max(1, d.startW - dx); x = d.startX + dx; break;
        case "s": h = Math.max(1, d.startH + dy); break;
        case "n": h = Math.max(1, d.startH - dy); y = d.startY + dy; break;
        case "se": w = Math.max(1, d.startW + dx); h = Math.max(1, d.startH + dy); break;
        case "ne": w = Math.max(1, d.startW + dx); h = Math.max(1, d.startH - dy); y = d.startY + dy; break;
        case "sw": w = Math.max(1, d.startW - dx); x = d.startX + dx; h = Math.max(1, d.startH + dy); break;
        case "nw": w = Math.max(1, d.startW - dx); x = d.startX + dx; h = Math.max(1, d.startH - dy); y = d.startY + dy; break;
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
        switch (d.handle) {
          case "e": x = d.startX; break;
          case "w": x = d.startX + (d.startW - w); break;
          case "s": y = d.startY; break;
          case "n": y = d.startY + (d.startH - h); break;
          case "se": x = d.startX; y = d.startY; break;
          case "ne": x = d.startX; y = d.startY + (d.startH - h); break;
          case "sw": x = d.startX + (d.startW - w); y = d.startY; break;
          case "nw": x = d.startX + (d.startW - w); y = d.startY + (d.startH - h); break;
        }
      }
      updateLayerTransient(d.id, { position: { x, y } as any, size: { w, h } as any });
      d.lastX = x; d.lastY = y; d.lastW = w; d.lastH = h;
    };
    const onUp = () => {
      const d = resizeDragRef.current;
      if (d) {
        updateLayer(d.id, { position: { x: d.lastX, y: d.lastY } as any, size: { w: d.lastW, h: d.lastH } as any });
      }
      resizeDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const beginRotate = (l: AnyLayer, e: ReactMouseEvent) => {
    if (e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    const centerX = l.position.x + l.size.w / 2;
    const centerY = l.position.y + l.size.h / 2;
    const world = clientToWorld(e.clientX, e.clientY);
    const angle0 = Math.atan2(world.y - centerY, world.x - centerX) * 180 / Math.PI;
    rotationDragRef.current = { id: l.id, centerX, centerY, startAngle: angle0 - (l.rotation ?? 0), lastRot: l.rotation ?? 0 };
    const onMove = (ev: MouseEvent) => {
      const d = rotationDragRef.current;
      if (!d) return;
      const wpt = clientToWorld(ev.clientX, ev.clientY);
      const angle = Math.atan2(wpt.y - d.centerY, wpt.x - d.centerX) * 180 / Math.PI;
      const rot = angle - d.startAngle;
      d.lastRot = rot;
      updateLayerTransient(d.id, { rotation: rot as any });
    };
    const onUp = () => {
      const d = rotationDragRef.current;
      if (d) {
        updateLayer(d.id, { rotation: d.lastRot as any });
      }
      rotationDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const renderSelectionOverlay = (l: AnyLayer) => {
    const boxStyle: React.CSSProperties = {
      position: "absolute",
      left: l.position.x,
      top: l.position.y,
      width: l.size.w,
      height: l.size.h,
      transform: `perspective(800px) rotateX(${(l as any).rotationX ?? 0}deg) rotateY(${(l as any).rotationY ?? 0}deg) rotate(${l.rotation ?? 0}deg)`,
      transformOrigin: "50% 50%",
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      outline: "1px solid rgba(59,130,246,0.9)",
      boxShadow: "0 0 0 2px rgba(59,130,246,0.2) inset",
      pointerEvents: "none",
    };
    const handleStyleBase: React.CSSProperties = {
      position: "absolute",
      width: 8,
      height: 8,
      background: "#ffffff",
      border: "1px solid #3b82f6",
      borderRadius: 2,
      boxShadow: "0 0 0 1px rgba(0,0,0,0.05)",
      transform: "translate(-50%, -50%)",
      pointerEvents: "auto",
      cursor: "nwse-resize",
    };
    const handles: Array<{ key: string; x: string | number; y: string | number; cursor: React.CSSProperties["cursor"]; h: any }>
      = [
        { key: "nw", x: 0, y: 0, cursor: "nwse-resize", h: (e: any) => beginResize(l, "nw", e) },
        { key: "n", x: "50%", y: 0, cursor: "ns-resize", h: (e: any) => beginResize(l, "n", e) },
        { key: "ne", x: "100%", y: 0, cursor: "nesw-resize", h: (e: any) => beginResize(l, "ne", e) },
        { key: "e", x: "100%", y: "50%", cursor: "ew-resize", h: (e: any) => beginResize(l, "e", e) },
        { key: "se", x: "100%", y: "100%", cursor: "nwse-resize", h: (e: any) => beginResize(l, "se", e) },
        { key: "s", x: "50%", y: "100%", cursor: "ns-resize", h: (e: any) => beginResize(l, "s", e) },
        { key: "sw", x: 0, y: "100%", cursor: "nesw-resize", h: (e: any) => beginResize(l, "sw", e) },
        { key: "w", x: 0, y: "50%", cursor: "ew-resize", h: (e: any) => beginResize(l, "w", e) },
      ];
    const rotationHandleStyle: React.CSSProperties = {
      position: "absolute",
      left: "50%",
      top: -20,
      width: 10,
      height: 10,
      background: "#fff",
      border: "1px solid #3b82f6",
      borderRadius: 9999,
      transform: "translate(-50%, -50%)",
      cursor: "grab",
      pointerEvents: "auto",
    };
    return (
      <div style={boxStyle}>
        {handles.map((h) => (
          <div
            key={h.key}
            style={{ ...handleStyleBase, left: h.x, top: h.y, cursor: h.cursor }}
            onMouseDown={(e) => h.h(e)}
          />
        ))}
        <div style={rotationHandleStyle} onMouseDown={(e) => beginRotate(l, e)} />
      </div>
    );
  };

  // showBoth removed: no overlay rendering of the non-active CA

  return (
    <Card
      ref={ref}
      className={`relative w-full h-full overflow-hidden p-0 ${isPanning ? 'cursor-grabbing' : ''}`}
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
      onMouseDown={(e) => {
        // Middle mouse button or Shift + drag to pan around
        if (!ref.current) return;
        if (!e.shiftKey && e.button !== 1) return;
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
          overflow: "visible",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.08)",
        }}
        onMouseDown={(e) => {
          if (e.shiftKey || e.button === 1) return;

          selectLayer(null);
        }}
      >
        {/* overlay removed */}
        {renderedLayers.map((l) => renderLayer(l))}
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
