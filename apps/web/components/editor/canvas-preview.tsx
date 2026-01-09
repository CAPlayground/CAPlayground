"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Minus, Plus, Crosshair, Square, Crop, Rotate3D, TabletSmartphone, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCanvasSize } from "@/hooks/use-canvas-size";
import { useCanvasZoom } from "@/hooks/use-canvas-zoom";
import { useCanvasPan } from "@/hooks/use-canvas-pan";
import { useClipboard } from "@/hooks/use-clipboard";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useTouchGestures } from "@/hooks/use-touch-gestures";
import { useEditor } from "./editor-context";
import type { AnyLayer } from "@/lib/ca/types";
import { getRootFlip } from "./canvas-preview/utils/coordinates";
import { applyOverrides } from "./canvas-preview/utils/layerApplication";
import GyroControls from "./gyro/GyroControls";
import { LayerRenderer } from "./inspector/canvas/LayerRenderer";
import { findById } from "@/lib/editor/layer-utils";
import { MoveableOverlay } from "./inspector/canvas/MoveableOverlay";
import Moveable from "react-moveable";
import { useTimeline } from "@/context/TimelineContext";
import DevicePreview from "./device-preview/DevicePreview";
import TimelineControls from "./timeline/TimelineControls";

export function CanvasPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const {
    doc,
    selectLayer,
    addImageLayerFromFile,
    hiddenLayerIds,
  } = useEditor();
  const docRef = useRef<typeof doc>(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);

  const size = useCanvasSize(ref);
  const { userScale, setUserScale } = useCanvasZoom(ref);
  const { pan, setPan, isPanning, setIsPanning, panDragRef } = useCanvasPan();
  const [useGyroControls, setUseGyroControls] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [gyroY, setGyroY] = useState(0);
  const [gyroX, setGyroX] = useState(0);
  const [SNAP_THRESHOLD] = useLocalStorage<number>("caplay_settings_snap_threshold", 12);
  const [snapEdgesEnabled] = useLocalStorage<boolean>("caplay_settings_snap_edges", true);
  const [snapLayersEnabled] = useLocalStorage<boolean>("caplay_settings_snap_layers", true);
  const [snapResizeEnabled] = useLocalStorage<boolean>("caplay_settings_snap_resize", true);
  const [snapRotationEnabled] = useLocalStorage<boolean>("caplay_settings_snap_rotation", true);
  const [showEdgeGuide, setShowEdgeGuide] = useLocalStorage<boolean>("caplay_preview_edge_guide", false);
  const [clipToCanvas, setClipToCanvas] = useLocalStorage<boolean>("caplay_preview_clip", false);
  const [showBackground] = useLocalStorage<boolean>("caplay_preview_show_background", true);
  const [showAnchorPoint] = useLocalStorage<boolean>("caplay_preview_anchor_point", false);
  const [pinchZoomSensitivity] = useLocalStorage<number>("caplay_settings_pinch_zoom_sensitivity", 1);

  useClipboard();
  const {
    isPlaying,
    play,
    pause,
    stop,
  } = useTimeline();

  useEffect(() => {
    if (showPreview) {
      play();
      setUserScale(.9);
    } else {
      pause();
      setUserScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [showPreview]);

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
    const src = current?.activeState;
    let effective: string | undefined = other.activeState;
    if (src && src !== 'Base State') {
      const isVariant = /\s(Light|Dark)$/.test(String(src));
      const base = String(src).replace(/\s(Light|Dark)$/, '');
      const otherStates = Array.isArray(other.states) ? other.states : [];
      const split = !!other.appearanceSplit;
      const mode: 'light' | 'dark' = (other.appearanceMode === 'dark') ? 'dark' : 'light';
      if (isVariant) {
        if (otherStates.includes(src)) {
          effective = src;
        } else if (split) {
          const light = `${base} Light`;
          const dark = `${base} Dark`;
          effective = otherStates.includes(light) ? light : (otherStates.includes(dark) ? dark : base);
        } else {
          effective = base;
        }
      } else {
        if (split) {
          const suffix = mode === 'dark' ? 'Dark' : 'Light';
          const candidate = `${base} ${suffix}`;
          effective = otherStates.includes(candidate) ? candidate : base;
        } else {
          effective = base;
        }
      }
    }
    return applyOverrides(other.layers, other.stateOverrides, effective);
  }, [other?.layers, other?.stateOverrides, other?.activeState, other?.states, other?.appearanceSplit, other?.appearanceMode, current?.activeState, currentKey, showBackground]);
  const [previewLayers, setPreviewLayers] = useState<AnyLayer[] | null>(null);

  const renderedLayers = useMemo(() => {
    if (previewLayers) return previewLayers;
    if (currentKey === 'floating' && showBackground && backgroundLayers.length > 0) {
      return [...backgroundLayers, ...appliedLayers];
    }
    return appliedLayers;
  }, [appliedLayers, backgroundLayers, currentKey, showBackground, previewLayers]);

  const hasAnyEnabledAnimation = useMemo(() => {
    const hasAnimation = (layer: AnyLayer): boolean => {
      if (layer.animations?.some(a => a.enabled)) return true;
      if (layer.type === 'video' || layer.type === 'emitter') return true;
      if (layer.type === 'replicator' && (layer.instanceDelay ?? 0) > 0) return true;
      return layer.children?.some(hasAnimation) ?? false;
    };
    return renderedLayers?.some(hasAnimation) ?? false;
  }, [renderedLayers]);

  useEffect(() => {
    if (!hasAnyEnabledAnimation && isPlaying) {
      stop();
    }
  }, [hasAnyEnabledAnimation, isPlaying]);

  useKeyboardShortcuts({
    canvasRef: ref,
    baseOffsetX,
    baseOffsetY,
    fitScale,
    pan,
    scale,
    userScale,
    setUserScale,
    setPan,
  });

  const {
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useTouchGestures({
    canvasRef: ref,
    baseOffsetX,
    baseOffsetY,
    fitScale,
    pan,
    scale,
    userScale,
    setUserScale,
    setPan,
    pinchZoomSensitivity,
  });

  const selectedLayer = !showPreview ? findById(renderedLayers, current?.selectedId) : null;
  const moveableRef = useRef<Moveable>(null);

  return (
    <Card
      ref={ref}
      className={`relative w-full h-full overflow-hidden p-0 ${isPanning ? 'cursor-grabbing' : ''}`}
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
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
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
      }}
      onKeyDown={() => { }}
    >
      <div
        className="absolute inset-0 dark:hidden cursor-[inherit]"
        style={{ background: "repeating-conic-gradient(#f8fafc 0% 25%, #e5e7eb 0% 50%) 50% / 20px 20px" }}
        onClick={() => selectLayer(null)}
      />
      <div
        className="absolute inset-0 hidden dark:block cursor-[inherit]"
        style={{ background: "repeating-conic-gradient(#0b1220 0% 25%, #1f2937 0% 50%) 50% / 20px 20px" }}
        onClick={() => selectLayer(null)}
      />
      <DevicePreview showPreview={showPreview} setPreviewLayers={setPreviewLayers} scale={scale}>
        <div
          id="root-canvas"
          className="absolute"
          style={{
            width: doc?.meta.width,
            height: doc?.meta.height,
            background: doc?.meta.background ?? "#f3f4f6",
            transform: showPreview ? `scale(1)` : `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: "top left",
            borderRadius: 0,
            overflow: clipToCanvas || showPreview ? "hidden" : "visible",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.08)",
            pointerEvents: showPreview ? "none" : "auto",
          }}
        >
          {currentKey === 'floating' && showBackground ? (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              {renderedLayers.slice(0, backgroundLayers.length).map((layer) =>
                <LayerRenderer
                  key={layer.id}
                  layer={layer}
                  useYUp={getRootFlip(doc?.meta.geometryFlipped) === 0}
                  siblings={renderedLayers}
                  gyroX={gyroX}
                  gyroY={gyroY}
                  useGyroControls={useGyroControls}
                  hiddenLayerIds={hiddenLayerIds}
                  moveableRef={moveableRef}
                  disableHitTesting
                />
              )}
            </div>
          ) : currentKey === 'background' ? (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              {renderedLayers.map((layer) => (
                <LayerRenderer
                  key={layer.id}
                  layer={layer}
                  useYUp={getRootFlip(doc?.meta.geometryFlipped) === 0}
                  siblings={renderedLayers}
                  gyroX={gyroX}
                  gyroY={gyroY}
                  useGyroControls={useGyroControls}
                  hiddenLayerIds={hiddenLayerIds}
                  moveableRef={moveableRef}
                />
              ))}
            </div>
          ) : currentKey === 'wallpaper' ? (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              {showPreview && <div id="lock-screen-clock" className="pt-[35px]" />}
              {renderedLayers.map((layer) => (
                <LayerRenderer
                  key={layer.id}
                  layer={layer}
                  useYUp={getRootFlip(doc?.meta.geometryFlipped) === 0}
                  siblings={renderedLayers}
                  gyroX={gyroX}
                  gyroY={gyroY}
                  useGyroControls={useGyroControls}
                  hiddenLayerIds={hiddenLayerIds}
                  moveableRef={moveableRef}
                />
              ))}
            </div>
          ) : null}
          {currentKey === 'floating' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
              {showPreview && <div id="lock-screen-clock" className="pt-[35px]" />}
              {showBackground
                ? renderedLayers.slice(backgroundLayers.length).map((layer) => (
                  <LayerRenderer
                    key={layer.id}
                    layer={layer}
                    useYUp={getRootFlip(doc?.meta.geometryFlipped) === 0}
                    siblings={renderedLayers}
                    gyroX={gyroX}
                    gyroY={gyroY}
                    useGyroControls={useGyroControls}
                    hiddenLayerIds={hiddenLayerIds}
                    moveableRef={moveableRef}
                  />
                ))
                : renderedLayers.map((layer) => (
                  <LayerRenderer
                    key={layer.id}
                    layer={layer}
                    useYUp={getRootFlip(doc?.meta.geometryFlipped) === 0}
                    siblings={renderedLayers}
                    gyroX={gyroX}
                    gyroY={gyroY}
                    useGyroControls={useGyroControls}
                    hiddenLayerIds={hiddenLayerIds}
                    moveableRef={moveableRef}
                  />
                ))
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
                zIndex: 2000,
              }}
            />
          )}
          <MoveableOverlay
            moveableRef={moveableRef}
            selectedLayer={selectedLayer}
            renderedLayers={renderedLayers}
            showAnchorPoint={showAnchorPoint}
            snapThreshold={SNAP_THRESHOLD}
            snapEdgesEnabled={snapEdgesEnabled}
            snapRotationEnabled={snapRotationEnabled}
            snapLayersEnabled={snapLayersEnabled}
            snapResizeEnabled={snapResizeEnabled}
            activeState={current?.activeState}
          />
        </div>
      </DevicePreview>

      {useGyroControls && (
        <GyroControls
          value={{ x: gyroX, y: gyroY }}
          onChange={(xy) => {
            setGyroX(xy.x);
            setGyroY(xy.y);
          }}
        />
      )}
      {/* Preview toggles (bottom-right) */}
      <div className="absolute flex flex-col left-2 top-2 z-10 gap-2 bg-white/80 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700 rounded-md px-1 py-1 shadow-sm">
        {currentKey === 'wallpaper' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant={useGyroControls ? "default" : "outline"}
                aria-pressed={useGyroControls}
                aria-label="Toggle gyro"
                onClick={() => setUseGyroControls((v: boolean) => !v)}
                className={`h-8 w-8 ${useGyroControls ? '' : 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'}`}
              >
                <Rotate3D className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Gyro</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={showPreview ? "default" : "outline"}
              aria-pressed={showPreview}
              aria-label="Toggle preview"
              onClick={() => setShowPreview((v: boolean) => !v)}
              className={`h-8 w-8 ${showPreview ? '' : 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'}`}
            >
              <TabletSmartphone className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Show Preview</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={showEdgeGuide ? "default" : "outline"}
              aria-pressed={showEdgeGuide}
              aria-label="Toggle edge guide"
              onClick={() => setShowEdgeGuide((v: boolean) => !v)}
              className={`h-8 w-8 ${showEdgeGuide ? '' : 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'}`}
            >
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Edge guide</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={clipToCanvas ? "default" : "outline"}
              aria-pressed={clipToCanvas}
              aria-label="Toggle clip to canvas"
              onClick={() => setClipToCanvas((v: boolean) => !v)}
              className={`h-8 w-8 ${clipToCanvas ? '' : 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'}`}
            >
              <Crop className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Clip to canvas</TooltipContent>
        </Tooltip>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent side="left">Zoom in</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent side="left">Zoom out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              aria-label="Re-center"
              onClick={() => {
                setUserScale(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <Crosshair className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Re-center</TooltipContent>
        </Tooltip>
      </div>

      {/* Playback controls - visible only if any animation is enabled */}
      {hasAnyEnabledAnimation && !showPreview && (
        <TimelineControls />
      )}
    </Card>
  );
}
