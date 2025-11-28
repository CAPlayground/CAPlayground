import Moveable, { MoveableManagerInterface, Renderer } from "react-moveable";
import { useEditor } from "../../editor-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnyLayer } from "@/lib/ca/types";
import { findPathTo } from "../../canvas-preview/utils/layerTree";
import { useTimeline } from "@/context/TimelineContext";

const DimensionViewable = {
  name: "dimensionViewable",
  props: [],
  events: [],
  render(moveable: MoveableManagerInterface<any, any>, React: Renderer) {
    const rect = moveable.getRect();
    return <div key={"dimension-viewer"} className={"moveable-dimension"} style={{
      position: "absolute",
      left: `${rect.width / 2}px`,
      top: `${rect.height + 20}px`,
      background: "#4af",
      borderRadius: "2px",
      padding: "2px 4px",
      color: "white",
      fontSize: "13px",
      whiteSpace: "nowrap",
      fontWeight: "bold",
      willChange: "transform",
      transform: `translate(-50%, 0px)`,
    }}>
      {Math.round(rect.offsetWidth)} x {Math.round(rect.offsetHeight)}
    </div>;
  },
};

const throttle = (value: number, step: number) => {
  return Math.round(value / step) * step;
}

const getLayersIds = (layers: AnyLayer[]): string[] => {
  return layers.flatMap((l) => {
    if (l.children) {
      return [l.id, ...getLayersIds(l.children)];
    }
    return l.id;
  });
}

export function MoveableOverlay({
  moveableRef,
  selectedLayer,
  renderedLayers,
  showAnchorPoint,
  snapThreshold,
  snapLayersEnabled,
  snapEdgesEnabled,
  snapRotationEnabled,
  snapResizeEnabled,
  activeState,
}: {
  moveableRef: React.RefObject<Moveable | null>;
  selectedLayer: AnyLayer | null | undefined;
  renderedLayers: AnyLayer[];
  showAnchorPoint: boolean;
  snapThreshold: number;
  snapLayersEnabled: boolean;
  snapEdgesEnabled: boolean;
  snapRotationEnabled: boolean;
  snapResizeEnabled: boolean;
  activeState?: string;
}) {
  const {
    updateLayer,
    doc,
  } = useEditor();
  const { isPlaying } = useTimeline();
  const canvasW = doc?.meta.width ?? 390;
  const canvasH = doc?.meta.height ?? 844;

  const elementGuidelines = useMemo(() => {
    return getLayersIds(renderedLayers)
      .filter((id: string) => id !== selectedLayer?.id)
      .map((id: string) => {
        return `[id="${id}"]`;
      });
  }, [renderedLayers, selectedLayer]);

  const targetRef = useRef<HTMLElement>(null);
  const [keepRatio, setKeepRatio] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [currentTranslation, setCurrentTranslation] = useState({
    x: 0,
    y: 0,
  });
  const [currentSize, setCurrentSize] = useState<{ w: number | null; h: number | null }>({
    w: null,
    h: null,
  });

  const path = findPathTo(renderedLayers, selectedLayer?.id ?? '');
  
  useEffect(() => {
    if (!selectedLayer) return;
    targetRef.current = document.getElementById(selectedLayer.id);
  }, [selectedLayer, path]);

  if (!selectedLayer) return null;
  const isResizing = currentSize.w !== null || currentSize.h !== null;
  const isDisabled = selectedLayer.animations?.enabled && isPlaying;
  return (
    <Moveable
      ables={[DimensionViewable]}
      ref={moveableRef}
      target={targetRef}
      origin={showAnchorPoint}
      verticalGuidelines={snapEdgesEnabled ? [0, canvasW / 2, canvasW] : []}
      horizontalGuidelines={snapEdgesEnabled ? [0, canvasH / 2, canvasH] : []}
      elementGuidelines={snapLayersEnabled ? elementGuidelines : []}
      props={{ dimensionViewable: true }}

      snappable={!isResizing || (isResizing && snapResizeEnabled)}
      snapThreshold={snapThreshold}
      snapDirections={{
        center: true,
        middle: true,
        bottom: true,
        left: true,
        right: true,
        top: true,
      }}
      elementSnapDirections={{
        center: true,
        middle: true,
        bottom: true,
        left: true,
        right: true,
        top: true,
      }}

      draggable={!isDisabled}
      dragArea
      onDragStart={({ target, currentTarget }) => {
      }}
      onDrag={({
        target,
        dist,
        transform,
      }) => {
        const useYUp = targetRef.current?.getAttribute('data-y-up') === 'true';
        setCurrentTranslation({
          x: dist[0],
          y: useYUp ? -dist[1] : dist[1],
        });
        target!.style.transform = transform;
      }}
      onDragEnd={({
        target
      }) => {
        if (!selectedLayer || (!currentTranslation.x && !currentTranslation.y)) return;
        updateLayer(selectedLayer.id, {
          position: {
            x: selectedLayer.position.x + currentTranslation.x,
            y: selectedLayer.position.y + currentTranslation.y,
          },
        });
        setCurrentTranslation({
          x: 0,
          y: 0,
        });
      }}

      rotatable={!isDisabled}
      snapRotationThreshold={6}
      snapRotationDegrees={snapRotationEnabled ? [0, 90, 180, 270] : []}
      onBeforeRotate={(e) => {
        if (e.inputEvent.shiftKey) {
          e.setRotation(throttle(e.rotation, 15));
        }
      }}
      onRotate={({
        target,
        transform,
        rotation,
      }) => {
        setCurrentRotation(rotation);
        target!.style.transform = transform;
      }}
      onRotateEnd={() => {
        if (!selectedLayer) return;
        updateLayer(selectedLayer.id, { rotation: -currentRotation });
      }}

      resizable={!isDisabled}
      keepRatio={keepRatio}
      onResizeStart={({ target }) => {
      }}
      onBeforeResize={(e) => {
        if (e.inputEvent.shiftKey) {
          setKeepRatio(true);
        } else {
          setKeepRatio(false);
        }
      }}
      onResize={({
        target, width, height,
        dist, delta, direction,
        transform,
      }) => {
        delta[0] && (target!.style.width = `${width}px`);
        delta[1] && (target!.style.height = `${height}px`);
        const useYUp = targetRef.current?.getAttribute('data-y-up') === 'true';
        setCurrentSize({
          w: width,
          h: height,
        });
        setCurrentTranslation({
          x: dist[0] * direction[0],
          y: (useYUp ? -dist[1] : dist[1]) * direction[1],
        });
        target!.style.transform = transform;
      }}
      onResizeEnd={({ target }) => {
        if (!selectedLayer) return;
        if (currentSize.w === null || currentSize.h === null) return;
        const dx = currentTranslation.x ?? 0;
        const dy = currentTranslation.y ?? 0;
        const rotDeg = selectedLayer.rotation ?? 0;
        const theta = (rotDeg * Math.PI) / 180;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const worldDx = cosT * dx - sinT * dy;
        const worldDy = sinT * dx + cosT * dy;
        updateLayer(selectedLayer.id, {
          size: {
            w: Math.round(currentSize.w),
            h: Math.round(currentSize.h),
          },
          position: {
            x: selectedLayer.position.x + worldDx / 2,
            y: selectedLayer.position.y + worldDy / 2,
          },
        });
        setCurrentTranslation({
          x: 0,
          y: 0,
        });
        setCurrentSize({
          w: null,
          h: null,
        });
      }}
    />
  );
}