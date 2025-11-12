import { useState, useEffect, useRef, useMemo } from 'react';
import { AnyLayer } from '@/lib/ca/types';
import { useEditor } from '@/components/editor/editor-context';

interface UseAnimationProps {
  combinedLayers: AnyLayer[];
  renderedLayers: AnyLayer[];
  setRenderedLayers: (layers: AnyLayer[]) => void;
  currentActiveState?: string;
  currentStateOverrides?: Record<string, any>;
  otherStateOverrides?: Record<string, any>;
  otherStates?: string[];
  otherAppearanceSplit?: boolean;
  otherAppearanceMode?: 'light' | 'dark';
  showBackground: boolean;
}

export function useAnimation({
  combinedLayers,
  renderedLayers,
  setRenderedLayers,
  showBackground,
}: UseAnimationProps) {
  const {
    isAnimationPlaying,
    setIsAnimationPlaying,
    setAnimatedLayers,
    doc,
   } = useEditor();
  const currentKey = doc?.activeCA ?? 'floating';
  const otherKey = currentKey === 'floating' ? 'background' : 'floating';
  const current = doc?.docs?.[currentKey];
  const other = doc?.docs?.[otherKey];
  const currentActiveState = current?.activeState;
  const currentStateOverrides = current?.stateOverrides;
  const otherStateOverrides = other?.stateOverrides;
  const otherAppearanceSplit = other?.appearanceSplit;
  const otherAppearanceMode = other?.appearanceMode;
  const otherStates = Array.isArray(other?.states) ? (other.states as string[]) : undefined;
  
  const [timeSec, setTimeSec] = useState(0);
  const lastTsRef = useRef<number | null>(null);
  const prevStateRef = useRef<string | undefined>(currentActiveState);
  const animRef = useRef<number | null>(null);

  // Animation frame loop
  useEffect(() => {
    if (!isAnimationPlaying) { 
      lastTsRef.current = null; 
      return; 
    }
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

  // Apply animations to layers
  useEffect(() => {
    const frame = JSON.parse(JSON.stringify(combinedLayers)) as AnyLayer[];
    const walk = (arr: AnyLayer[]) => {
      for (const l of arr) {
        evalLayerAnimation(l, timeSec);
        if (l.children?.length) {
          walk(l.children);
        }
      }
    };
    walk(frame);
    setRenderedLayers(frame);
    setAnimatedLayers(frame);
  }, [timeSec, combinedLayers, setAnimatedLayers, setRenderedLayers]);

  // Check if any animations are enabled
  const hasAnyEnabledAnimation = useMemo(() => {
    const check = (arr: AnyLayer[]): boolean => {
      for (const l of arr) {
        const anim: any = (l as any).animations;
        if (anim && anim.enabled) return true;
        if (l.type === 'video') return true;
        if (l.type === 'emitter') return true;
        if (l.type === 'replicator' && ((l as any).instanceDelay ?? 0) > 0) return true;
        if (l.children?.length) {
          if (check(l.children)) return true;
        }
      }
      return false;
    };
    return check(combinedLayers || []);
  }, [combinedLayers]);

  // Auto-stop animation if no animations are enabled
  useEffect(() => {
    if (!hasAnyEnabledAnimation && isAnimationPlaying) setIsAnimationPlaying(false);
  }, [hasAnyEnabledAnimation, isAnimationPlaying, setIsAnimationPlaying]);

  // Helper functions for state transitions
  const indexById = (arr: AnyLayer[]) => {
    const map: Record<string, AnyLayer> = {};
    const walk = (l: AnyLayer) => {
      map[l.id] = l;
      if (l.children?.length) {
        l.children.forEach(walk);
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

  // State transition animations
  useEffect(() => {
    const prevState = prevStateRef.current;
    const nextState = currentActiveState;
    
    if (prevState === nextState) {
      setRenderedLayers(combinedLayers);
      return;
    }

    const gens: Array<{ elements: { targetId: string; keyPath: string; animation?: { duration?: number } }[] }> = [];
    const addGen = (targetId: string, keyPath: string, duration = 0.8) => {
      if (!gens.length) gens.push({ elements: [] });
      gens[0].elements.push({ targetId, keyPath, animation: { duration } });
    };
    
    const ovs = currentStateOverrides || {};
    const byKey = (arr: any[]) => {
      const m = new Map<string, Map<string, number>>();
      for (const it of arr) {
        if (typeof it.value !== 'number') continue;
        if (!m.has(it.targetId)) m.set(it.targetId, new Map());
        m.get(it.targetId)!.set(it.keyPath, it.value);
      }
      return m;
    };
    
    const pickList = (st?: string): Array<{ targetId: string; keyPath: string; value: any }> => {
      if (!st) return [];
      const base = /\s(Light|Dark)$/.test(String(st)) ? String(st).replace(/\s(Light|Dark)$/, '') : String(st);
      const direct = ovs[st] || [];
      if (direct && direct.length) return direct as any;
      return (ovs[base] || []) as any;
    };
    
    const toList = pickList(nextState);
    const fromList = pickList(prevState);

    let fromMapBk = new Map<string, Map<string, number>>();
    let toMapBk = new Map<string, Map<string, number>>();
    
    if (currentKey === 'floating' && showBackground && otherStateOverrides) {
      const otherSO = otherStateOverrides;
      const otherStatesArr = otherStates || [];
      const otherSplit = otherAppearanceSplit || false;
      const otherMode = otherAppearanceMode || 'light';
      
      const mapBgState = (src?: string): string | undefined => {
        if (!src || src === 'Base State') return undefined;
        const isVar = /\s(Light|Dark)$/.test(String(src));
        const base = String(src).replace(/\s(Light|Dark)$/,'');
        if (isVar) {
          if (otherStatesArr.includes(src)) return src;
          if (otherSplit) {
            const light = `${base} Light`;
            const dark = `${base} Dark`;
            return otherStatesArr.includes(light) ? light : (otherStatesArr.includes(dark) ? dark : base);
          }
          return base;
        } else {
          if (otherSplit) {
            const suffix = otherMode === 'dark' ? 'Dark' : 'Light';
            const cand = `${base} ${suffix}`;
            return otherStatesArr.includes(cand) ? cand : base;
          }
          return base;
        }
      };
      
      const fromBg = mapBgState(prevState);
      const toBg = mapBgState(nextState);
      const pickListBg = (st?: string): Array<{ targetId: string; keyPath: string; value: any }> => {
        if (!st) return [];
        const base = /\s(Light|Dark)$/.test(String(st)) ? String(st).replace(/\s(Light|Dark)$/,'') : String(st);
        const direct = otherSO[st] || [];
        if (direct && direct.length) return direct as any;
        return (otherSO[base] || []) as any;
      };
      fromMapBk = byKey(pickListBg(fromBg));
      toMapBk = byKey(pickListBg(toBg));
    }
    
    const keys = [
      'position.x', 'position.y', 'bounds.size.width', 'bounds.size.height', 'transform.rotation.z', 'transform.rotation.x', 'transform.rotation.y', 'opacity', 'cornerRadius'
    ];
    const fromMap = byKey(fromList);
    const toMap = byKey(toList);
    const ids = new Set<string>([
      ...fromMap.keys(),
      ...toMap.keys(),
      ...fromMapBk.keys(),
      ...toMapBk.keys(),
    ]);
    
    ids.forEach(id => {
      keys.forEach(k => {
        const a = (fromMap.get(id)?.get(k)) ?? (fromMapBk.get(id)?.get(k));
        const b = (toMap.get(id)?.get(k)) ?? (toMapBk.get(id)?.get(k));
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
      const frame = JSON.parse(JSON.stringify(combinedLayers)) as AnyLayer[];
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
  }, [currentActiveState, combinedLayers, currentStateOverrides, otherStateOverrides, otherStates, otherAppearanceSplit, otherAppearanceMode, currentKey, showBackground, setRenderedLayers]);

  return {
    timeSec,
    setTimeSec,
    lastTsRef,
    evalLayerAnimation: (l: AnyLayer, t: number) => evalLayerAnimation(l, t),
    hasAnyEnabledAnimation,
  };
}
