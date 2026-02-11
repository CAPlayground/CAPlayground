import { useEffect, useRef, useState } from "react";
import { AnyLayer } from "@/lib/ca/types";
import { useEditor } from "@/components/editor/editor-context";
import { lerp } from "@/lib/editor/layer-utils";

interface TransitionValue {
  position: { x: number; y: number };
  zPosition: number;
  scale: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
  cornerRadius: number;
  opacity: number;
  size: { w: number; h: number };
}

const TRANSITION_DURATION = 800;

export default function useStateTransition(layer: AnyLayer): TransitionValue {
  const { doc } = useEditor();
  const currentKey = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[currentKey];
  const activeState = current?.activeState ?? 'Base';

  const layerX = layer.position.x;
  const layerY = layer.position.y;
  const layerW = layer.size.w;
  const layerH = layer.size.h;
  const layerZ = layer.zPosition ?? 0;
  const layerScale = layer.scale ?? 1;
  const layerRotation = layer.rotation ?? 0;
  const layerRotationX = layer.rotationX ?? 0;
  const layerRotationY = layer.rotationY ?? 0;
  const layerCornerRadius = layer.cornerRadius ?? 0;
  const layerOpacity = layer.opacity ?? 1;

  const [value, setValue] = useState<TransitionValue>(() => ({
    position: { x: layerX, y: layerY },
    zPosition: layerZ,
    scale: layerScale,
    rotation: layerRotation,
    rotationX: layerRotationX,
    rotationY: layerRotationY,
    cornerRadius: layerCornerRadius,
    opacity: layerOpacity,
    size: { w: layerW, h: layerH },
  }));

  const isTransitioningRef = useRef(false);
  const startValueRef = useRef<TransitionValue>(value);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const previousStateRef = useRef(activeState);

  const targetRef = useRef<TransitionValue>({
    position: { x: layerX, y: layerY },
    zPosition: layerZ,
    scale: layerScale,
    rotation: layerRotation,
    rotationX: layerRotationX,
    rotationY: layerRotationY,
    cornerRadius: layerCornerRadius,
    opacity: layerOpacity,
    size: { w: layerW, h: layerH },
  });

  targetRef.current = {
    position: { x: layerX, y: layerY },
    zPosition: layerZ,
    scale: layerScale,
    rotation: layerRotation,
    rotationX: layerRotationX,
    rotationY: layerRotationY,
    cornerRadius: layerCornerRadius,
    opacity: layerOpacity,
    size: { w: layerW, h: layerH },
  };

  useEffect(() => {
    if (activeState !== previousStateRef.current) {
      previousStateRef.current = activeState;
      isTransitioningRef.current = true;
      startValueRef.current = value;
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
        const target = targetRef.current;
        const start = startValueRef.current;

        setValue({
          position: {
            x: lerp(start.position.x, target.position.x, progress),
            y: lerp(start.position.y, target.position.y, progress),
          },
          zPosition: lerp(start.zPosition, target.zPosition, progress),
          scale: lerp(start.scale, target.scale, progress),
          rotation: lerp(start.rotation, target.rotation, progress),
          rotationX: lerp(start.rotationX, target.rotationX, progress),
          rotationY: lerp(start.rotationY, target.rotationY, progress),
          cornerRadius: lerp(start.cornerRadius, target.cornerRadius, progress),
          opacity: lerp(start.opacity, target.opacity, progress),
          size: {
            w: lerp(start.size.w, target.size.w, progress),
            h: lerp(start.size.h, target.size.h, progress),
          },
        });

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          isTransitioningRef.current = false;
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeState]);

  useEffect(() => {
    if (!isTransitioningRef.current) {
      setValue(targetRef.current);
    }
  }, [layerX, layerY, layerW, layerH, layerZ, layerRotation, layerRotationX, layerRotationY, layerCornerRadius, layerOpacity]);

  return value;
}
