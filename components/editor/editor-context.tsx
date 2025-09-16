"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AnyLayer, CAProject, GroupLayer, ImageLayer, LayerBase, ShapeLayer, TextLayer } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";

export type ProjectDocument = {
  meta: Pick<CAProject, "id" | "name" | "width" | "height" | "background">;
  layers: AnyLayer[];
  selectedId?: string | null;
  assets?: Record<string, { filename: string; dataURL: string }>;
  states: string[];
  stateOverrides?: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>;
  activeState?: 'Base State' | 'Locked' | 'Unlock' | 'Sleep';
  stateTransitions?: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }>; }>;
};

const STORAGE_PREFIX = "caplayground-project:";
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type EditorContextValue = {
  doc: ProjectDocument | null;
  setDoc: React.Dispatch<React.SetStateAction<ProjectDocument | null>>;
  addTextLayer: () => void;
  addImageLayer: (src?: string) => void;
  addImageLayerFromFile: (file: File) => Promise<void>;
  addImageLayerFromBlob: (blob: Blob, filename?: string) => Promise<void>;
  replaceImageForLayer: (layerId: string, file: File) => Promise<void>;
  addShapeLayer: (shape?: ShapeLayer["shape"]) => void;
  updateLayer: (id: string, patch: Partial<AnyLayer>) => void;
  updateLayerTransient: (id: string, patch: Partial<AnyLayer>) => void;
  selectLayer: (id: string | null) => void;
  deleteLayer: (id: string) => void;
  copySelectedLayer: () => void;
  pasteFromClipboard: (payload?: any) => void;
  duplicateLayer: (id?: string) => void;
  persist: () => void;
  undo: () => void;
  redo: () => void;
  addState: (name?: string) => void;
  renameState: (oldName: string, newName: string) => void;
  deleteState: (name: string) => void;
  setActiveState: (state: 'Base State' | 'Locked' | 'Unlock' | 'Sleep') => void;
  updateStateOverride: (targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => void;
  updateStateOverrideTransient: (targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => void;
  isAnimationPlaying: boolean;
  setIsAnimationPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  animatedLayers: AnyLayer[];
  setAnimatedLayers: React.Dispatch<React.SetStateAction<AnyLayer[]>>;
};

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export function EditorProvider({
  projectId,
  initialMeta,
  children,
}: {
  projectId: string;
  initialMeta: Pick<CAProject, "id" | "name" | "width" | "height"> & { background?: string };
  children: React.ReactNode;
}) {
  const storageKey = STORAGE_PREFIX + projectId;
  const [storedDoc, setStoredDoc] = useLocalStorage<ProjectDocument | null>(storageKey, null);
  const [doc, setDoc] = useState<ProjectDocument | null>(null);
  const pastRef = useRef<ProjectDocument[]>([]);
  const futureRef = useRef<ProjectDocument[]>([]);
  const skipPersistRef = useRef(false);
  const clipboardRef = useRef<{
    type: 'layers';
    data: AnyLayer[];
    assets?: Record<string, { filename: string; dataURL: string }>;
  } | null>(null);
  
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [animatedLayers, setAnimatedLayers] = useState<AnyLayer[]>([]);

  const pushHistory = useCallback((prev: ProjectDocument) => {
    pastRef.current.push(JSON.parse(JSON.stringify(prev)) as ProjectDocument);
    futureRef.current = [];
  }, []);

  const findById = useCallback((layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined => {
    if (!id) return undefined;
    for (const l of layers) {
      if (l.id === id) return l;
      if ((l as any).type === 'group') {
        const g = l as GroupLayer;
        const found = findById(g.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }, []);

  const cloneLayerDeep = useCallback((layer: AnyLayer): AnyLayer => {
    const newId = genId();
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
  }, []);

  useEffect(() => {
    if (doc !== null) return;
    const fixedStates = ["Locked", "Unlock", "Sleep"] as const;
    if (storedDoc) {
      const next: ProjectDocument = {
        ...(storedDoc as any),
        states: [...fixedStates],
        activeState: (storedDoc as any).activeState || 'Base State',
        stateOverrides: (storedDoc as any).stateOverrides || {},
        stateTransitions: (storedDoc as any).stateTransitions || [],
      } as ProjectDocument;
      setDoc(next);
    } else {
      setDoc({
        meta: {
          id: initialMeta.id,
          name: initialMeta.name,
          width: initialMeta.width,
          height: initialMeta.height,
          background: initialMeta.background ?? "#e5e7eb",
        },
        layers: [],
        selectedId: null,
        assets: {},
        states: [...fixedStates],
        activeState: 'Base State',
        stateOverrides: {},
        stateTransitions: [],
      });
    }
  }, [doc, storedDoc, initialMeta.id]);

  const persist = useCallback(() => {
    if (doc) setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  useEffect(() => {
    if (!doc) return;
    if (skipPersistRef.current) {
     
      skipPersistRef.current = false;
      return;
    }
    setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  const selectLayer = useCallback((id: string | null) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      return { ...prev, selectedId: id };
    });
  }, []);

  const addBase = useCallback((name: string): LayerBase => ({
    id: genId(),
    name,
    position: { x: 50, y: 50 },
    size: { w: 120, h: 40 },
    rotation: 0,
    visible: true,
  }), []);

  const addTextLayer = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: TextLayer = {
        ...addBase("Text Layer"),
        type: "text",
        text: "Text Layer",
        color: "#111827",
        fontSize: 16,
        align: "left",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const addImageLayerFromBlob = useCallback(async (blob: Blob, filename?: string) => {
    const dataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ImageLayer = {
        ...addBase(filename || "Pasted Image"),
        type: "image",
        size: { w: 200, h: 120 },
        src: dataURL,
        fit: "fill",
      };
      const assets = { ...(prev.assets || {}) };
      assets[layer.id] = { filename: sanitizeFilename(filename || `pasted-${Date.now()}.png`), dataURL };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id, assets };
    });
  }, [addBase]);

  const replaceImageForLayer = useCallback(async (layerId: string, file: File) => {
    const dataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const filename = sanitizeFilename(file.name) || `image-${Date.now()}.png`;
      const assets = { ...(prev.assets || {}) };
      assets[layerId] = { filename, dataURL };
      const updateRec = (layers: AnyLayer[]): AnyLayer[] =>
        layers.map((l) => {
          if (l.id === layerId && l.type === "image") {
            return { ...l, src: dataURL } as AnyLayer;
          }
          if (l.type === "group") {
            return { ...(l as GroupLayer), children: updateRec((l as GroupLayer).children) } as AnyLayer;
          }
          return l;
        });
      return { ...prev, assets, layers: updateRec(prev.layers) };
    });
  }, []);

  const addImageLayer = useCallback((src?: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ImageLayer = {
        ...addBase("Image Layer"),
        type: "image",
        size: { w: 200, h: 120 },
        src: src ?? "https://placehold.co/200x120/png",
        fit: "fill",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const addImageLayerFromFile = useCallback(async (file: File) => {
    const dataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ImageLayer = {
        ...addBase(file.name || "Image Layer"),
        type: "image",
        size: { w: 200, h: 120 },
        src: dataURL,
        fit: "fill",
      };
      const assets = { ...(prev.assets || {}) };
      assets[layer.id] = { filename: sanitizeFilename(file.name) || `image-${Date.now()}.png`, dataURL };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id, assets };
    });
  }, [addBase]);

  function sanitizeFilename(name: string): string {
    const n = (name || '').trim();
    if (!n) return '';
    const parts = n.split('.');
    const ext = parts.length > 1 ? parts.pop() as string : '';
    const base = parts.join('.') || 'image';
    const safeBase = base.replace(/[^a-z0-9\-_.]+/gi, '_');
    const safeExt = (ext || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
    return safeExt ? `${safeBase}.${safeExt}` : safeBase;
  }

  const addShapeLayer = useCallback((shape: ShapeLayer["shape"] = "rect") => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ShapeLayer = {
        ...addBase("Shape Layer"),
        type: "shape",
        size: { w: 120, h: 120 },
        shape,
        fill: "#60a5fa",
        radius: shape === "rounded-rect" ? 8 : undefined,
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const updateInTree = useCallback((layers: AnyLayer[], id: string, patch: Partial<AnyLayer>): AnyLayer[] => {
    return layers.map((l) => {
      if (l.id === id) return { ...l, ...patch } as AnyLayer;
      if (l.type === "group") {
        const g = l as GroupLayer;
        return { ...g, children: updateInTree(g.children, id, patch) } as AnyLayer;
      }
      return l;
    });
  }, []);

  const deleteInTree = useCallback((layers: AnyLayer[], id: string): AnyLayer[] => {
    const next: AnyLayer[] = [];
    for (const l of layers) {
      if (l.id === id) continue;
      if (l.type === "group") {
        const g = l as GroupLayer;
        next.push({ ...g, children: deleteInTree(g.children, id) } as AnyLayer);
      } else {
        next.push(l);
      }
    }
    return next;
  }, []);

  const containsId = useCallback((layers: AnyLayer[], id: string): boolean => {
    for (const l of layers) {
      if (l.id === id) return true;
      if (l.type === "group" && containsId((l as GroupLayer).children, id)) return true;
    }
    return false;
  }, []);

  const updateLayer = useCallback((id: string, patch: Partial<AnyLayer>) => {
    setDoc((prev) => {
      if (!prev) return prev;
      if (prev.activeState && prev.activeState !== 'Base State') {
        const p: any = patch;
        const nextState = { ...(prev.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
        const list = [...(nextState[prev.activeState] || [])];
        const upd = (keyPath: 'position.x' | 'position.y' | 'opacity' | 'bounds.size.width' | 'bounds.size.height' | 'transform.rotation.z', value: number) => {
          const idx = list.findIndex((o) => o.targetId === id && o.keyPath === keyPath);
          if (idx >= 0) list[idx] = { ...list[idx], value };
          else list.push({ targetId: id, keyPath, value });
        };
        if (p.position && typeof p.position.x === 'number') upd('position.x', p.position.x);
        if (p.position && typeof p.position.y === 'number') upd('position.y', p.position.y);
        if (p.size && typeof p.size.w === 'number') upd('bounds.size.width', p.size.w);
        if (p.size && typeof p.size.h === 'number') upd('bounds.size.height', p.size.h);
        if (typeof p.rotation === 'number') upd('transform.rotation.z', p.rotation as number);
        if (typeof p.opacity === 'number') upd('opacity', p.opacity as number);
        nextState[prev.activeState] = list;
        pushHistory(prev);
        return { ...prev, stateOverrides: nextState } as ProjectDocument;
      }
      pushHistory(prev);
      return {
        ...prev,
        layers: updateInTree(prev.layers, id, patch),
      };
    });
  }, [updateInTree]);

  const updateLayerTransient = useCallback((id: string, patch: Partial<AnyLayer>) => {
    skipPersistRef.current = true;
    setDoc((prev) => {
      if (!prev) return prev;
      if (prev.activeState && prev.activeState !== 'Base State') {
        const p: any = patch;
        const nextState = { ...(prev.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
        const list = [...(nextState[prev.activeState] || [])];
        const upd = (keyPath: 'position.x' | 'position.y' | 'opacity' | 'bounds.size.width' | 'bounds.size.height' | 'transform.rotation.z', value: number) => {
          const idx = list.findIndex((o) => o.targetId === id && o.keyPath === keyPath);
          if (idx >= 0) list[idx] = { ...list[idx], value };
          else list.push({ targetId: id, keyPath, value });
        };
        if (p.position && typeof p.position.x === 'number') upd('position.x', p.position.x);
        if (p.position && typeof p.position.y === 'number') upd('position.y', p.position.y);
        if (p.size && typeof p.size.w === 'number') upd('bounds.size.width', p.size.w);
        if (p.size && typeof p.size.h === 'number') upd('bounds.size.height', p.size.h);
        if (typeof p.rotation === 'number') upd('transform.rotation.z', p.rotation as number);
        if (typeof p.opacity === 'number') upd('opacity', p.opacity as number);
        nextState[prev.activeState] = list;
        return { ...prev, stateOverrides: nextState } as ProjectDocument;
      }
      return {
        ...prev,
        layers: updateInTree(prev.layers, id, patch),
      };
    });
  }, [updateInTree]);

  const deleteLayer = useCallback((id: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const nextLayers = deleteInTree(prev.layers, id);
      const nextSelected = prev.selectedId === id || (prev.selectedId ? !containsId(nextLayers, prev.selectedId) : false) ? null : prev.selectedId;
      return { ...prev, layers: nextLayers, selectedId: nextSelected };
    });
  }, [deleteInTree, containsId]);

  const copySelectedLayer = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      const sel = findById(prev.layers, prev.selectedId ?? null);
      if (!sel) return prev;
      const images: Record<string, { filename: string; dataURL: string }> = {};
      const walk = (l: AnyLayer) => {
        if (l.type === 'image') {
          const a = (prev.assets || {})[l.id];
          if (a) images[l.id] = { ...a };
        } else if (l.type === 'group') {
          (l as GroupLayer).children.forEach(walk);
        }
      };
      walk(sel);
      clipboardRef.current = { type: 'layers', data: [JSON.parse(JSON.stringify(sel)) as AnyLayer], assets: images };
      try {
        navigator.clipboard?.writeText?.(JSON.stringify({ __caplay__: true, type: 'layers', data: clipboardRef.current.data, assets: clipboardRef.current.assets }));
      } catch {}
      return prev;
    });
  }, [findById]);

  const pasteFromClipboard = useCallback((payload?: any) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const src = payload && payload.__caplay__ ? payload : clipboardRef.current;
      if (!src || src.type !== 'layers') return prev;
      const cloned: AnyLayer[] = (src.data || []).map(cloneLayerDeep);
      const idMap = new Map<string, string>();
      const collectMap = (orig: AnyLayer[], copies: AnyLayer[]) => {
        for (let i = 0; i < orig.length; i++) {
          const o = orig[i];
          const c = copies[i];
          if (o && c) {
            idMap.set((o as any).id, (c as any).id);
            if (o.type === 'group' && c.type === 'group') {
              collectMap((o as GroupLayer).children, (c as GroupLayer).children);
            }
          }
        }
      };
      collectMap(src.data as AnyLayer[], cloned);
      const assets = { ...(prev.assets || {}) };
      const srcAssets = ((src as any).assets || {}) as Record<string, { filename: string; dataURL: string }>;
      for (const [oldId, asset] of Object.entries(srcAssets) as Array<[string, { filename: string; dataURL: string }]>) {
        const newId = idMap.get(oldId);
        if (newId) assets[newId] = { filename: asset.filename, dataURL: asset.dataURL };
      }
      pushHistory(prev);
      return { ...prev, layers: [...prev.layers, ...cloned], selectedId: cloned[cloned.length - 1]?.id ?? prev.selectedId, assets };
    });
  }, [cloneLayerDeep, pushHistory]);

  const duplicateLayer = useCallback((id?: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const targetId = id || prev.selectedId || null;
      if (!targetId) return prev;
      const sel = findById(prev.layers, targetId);
      if (!sel) return prev;
      const images: Record<string, { filename: string; dataURL: string }> = {};
      const walk = (l: AnyLayer) => {
        if (l.type === 'image') {
          const a = (prev.assets || {})[l.id];
          if (a) images[l.id] = { ...a };
        } else if (l.type === 'group') {
          (l as GroupLayer).children.forEach(walk);
        }
      };
      walk(sel);
      const cloned = cloneLayerDeep(sel);
      const assets = { ...(prev.assets || {}) };
      const idMap = new Map<string, string>();
      const buildMap = (o: AnyLayer, c: AnyLayer) => {
        idMap.set((o as any).id, (c as any).id);
        if (o.type === 'group' && c.type === 'group') {
          const oc = (o as GroupLayer).children;
          const cc = (c as GroupLayer).children;
          for (let i = 0; i < oc.length; i++) buildMap(oc[i], cc[i]);
        }
      };
      buildMap(sel, cloned);
      for (const [oldId, asset] of Object.entries(images)) {
        const newId = idMap.get(oldId);
        if (newId) assets[newId] = { filename: asset.filename, dataURL: asset.dataURL };
      }
      pushHistory(prev);
      return { ...prev, layers: [...prev.layers, cloned], selectedId: (cloned as any).id, assets };
    });
  }, [findById, cloneLayerDeep]);

  const undo = useCallback(() => {
    setDoc((current) => {
      if (!current) return current;
      const past = pastRef.current;
      if (past.length === 0) return current;
      const previous = past.pop() as ProjectDocument;
      futureRef.current.push(current);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setDoc((current) => {
      if (!current) return current;
      const future = futureRef.current;
      if (future.length === 0) return current;
      const next = future.pop() as ProjectDocument;
      pastRef.current.push(current);
      return next;
    });
  }, []);

  const addState = useCallback((_name?: string) => {
    return;
  }, []);

  const renameState = useCallback((_oldName: string, _newName: string) => {
    return;
  }, []);

  const deleteState = useCallback((_name: string) => {
    return;
  }, []);

  const setActiveState = useCallback((state: 'Base State' | 'Locked' | 'Unlock' | 'Sleep') => {
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, activeState: state };
    });
  }, []);

  const updateStateOverride = useCallback((targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const state = prev.activeState && prev.activeState !== 'Base State' ? prev.activeState : null;
      if (!state) return prev;
      const next = { ...(prev.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
      const list = [...(next[state] || [])];
      const idx = list.findIndex((o) => o.targetId === targetId && o.keyPath === keyPath);
      if (idx >= 0) list[idx] = { ...list[idx], value };
      else list.push({ targetId, keyPath, value });
      next[state] = list;
      pushHistory(prev);
      return { ...prev, stateOverrides: next } as ProjectDocument;
    });
  }, [pushHistory]);

  const updateStateOverrideTransient = useCallback((targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => {
    skipPersistRef.current = true;
    setDoc((prev) => {
      if (!prev) return prev;
      const state = prev.activeState && prev.activeState !== 'Base State' ? prev.activeState : null;
      if (!state) return prev;
      const next = { ...(prev.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
      const list = [...(next[state] || [])];
      const idx = list.findIndex((o) => o.targetId === targetId && o.keyPath === keyPath);
      if (idx >= 0) list[idx] = { ...list[idx], value };
      else list.push({ targetId, keyPath, value });
      next[state] = list;
      return { ...prev, stateOverrides: next } as ProjectDocument;
    });
  }, []);

  const value = useMemo<EditorContextValue>(() => ({
    doc,
    setDoc,
    addTextLayer,
    addImageLayer,
    addImageLayerFromFile,
    addImageLayerFromBlob,
    replaceImageForLayer,
    addShapeLayer,
    updateLayer,
    updateLayerTransient,
    selectLayer,
    deleteLayer,
    copySelectedLayer,
    pasteFromClipboard,
    duplicateLayer,
    persist,
    undo,
    redo,
    addState,
    renameState,
    deleteState,
    setActiveState,
    updateStateOverride,
    updateStateOverrideTransient,
    isAnimationPlaying,
    setIsAnimationPlaying,
    animatedLayers,
    setAnimatedLayers,
  }), [doc, addTextLayer, addImageLayer, addImageLayerFromFile, replaceImageForLayer, addShapeLayer, updateLayer, updateLayerTransient, selectLayer, deleteLayer, persist, undo, redo, addState, renameState, deleteState, setActiveState, updateStateOverride, updateStateOverrideTransient, isAnimationPlaying, animatedLayers]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
