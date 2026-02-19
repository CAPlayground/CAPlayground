import { useEffect, useMemo, useRef, useState } from "react";
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
  backgroundColor?: string;
}

const TRANSITION_DURATION = 800;

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return [0, 0, 0];
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    lerp(r1, r2, t),
    lerp(g1, g2, t),
    lerp(b1, b2, t),
  );
}

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
  const layerBgColor = (layer as any).backgroundColor as string | undefined;

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
    backgroundColor: layerBgColor,
  }));

  const isTransitioningRef = useRef(false);
  const startValueRef = useRef<TransitionValue>(value);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const previousStateRef = useRef(activeState);

  const target = useMemo<TransitionValue>(() => ({
    position: { x: layerX, y: layerY },
    zPosition: layerZ,
    scale: layerScale,
    rotation: layerRotation,
    rotationX: layerRotationX,
    rotationY: layerRotationY,
    cornerRadius: layerCornerRadius,
    opacity: layerOpacity,
    size: { w: layerW, h: layerH },
    backgroundColor: layerBgColor,
  }), [
    layerX,
    layerY,
    layerZ,
    layerScale,
    layerRotation,
    layerRotationX,
    layerRotationY,
    layerCornerRadius,
    layerOpacity,
    layerW,
    layerH,
    layerBgColor,
  ]);

  useEffect(() => {
    if (activeState !== previousStateRef.current) {
      previousStateRef.current = activeState;
      isTransitioningRef.current = true;
      startValueRef.current = value;
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
        const start = startValueRef.current;

        const startBg = start.backgroundColor;
        const targetBg = target.backgroundColor;
        let interpolatedBg: string | undefined = targetBg;
        if (startBg && targetBg && startBg !== targetBg) {
          interpolatedBg = lerpColor(startBg, targetBg, progress);
        }

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
          backgroundColor: interpolatedBg,
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
  }, [activeState, target]);

  useEffect(() => {
    if (!isTransitioningRef.current) {
      setValue(target);
    }
  }, [target]);

  return value;
}
