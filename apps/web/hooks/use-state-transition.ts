import { useEffect, useRef, useState } from "react";
import { AnyLayer } from "@/lib/ca/types";
import { useEditor } from "@/components/editor/editor-context";

export default function useStateTransition(
  layer: AnyLayer,
) {
  const initValue = {
    position: {
      y: layer.position.y,
      x: layer.position.x,
    },
    zPosition: layer.zPosition ?? 0,
    rotation: layer.rotation ?? 0,
    rotationX: layer.rotationX ?? 0,
    rotationY: layer.rotationY ?? 0,
    cornerRadius: layer.cornerRadius ?? 0,
    opacity: layer.opacity ?? 1,
    size: {
      w: layer.size.w,
      h: layer.size.h,
    },
  }
  const {
    doc
  } = useEditor();
  const currentKey = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[currentKey];
  const activeState = current?.activeState ?? 'Base';
  const [value, setValue] = useState(initValue);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startValue = useRef(initValue);
  const startTime = useRef<number | null>(null);
  const previousState = useRef(activeState);
  const transitionDuration = 800;
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(Date.now());
  const targetValueRef = useRef(initValue);

  useEffect(() => {
    const overrideY = layer.position.y;
    const overrideX = layer.position.x;
    const overrideW = layer.size.w;
    const overrideH = layer.size.h;
    const overrideRotation = layer.rotation ?? 0;
    const overrideRotationX = layer.rotationX ?? 0;
    const overrideRotationY = layer.rotationY ?? 0;
    const overrideCornerRadius = layer.cornerRadius ?? 0;
    const overrideOpacity = layer.opacity ?? 1;
    const overrideZPosition = layer.zPosition ?? 0;

    targetValueRef.current = {
      position: {
        y: overrideY,
        x: overrideX,
      },
      zPosition: overrideZPosition,
      rotation: overrideRotation,
      rotationX: overrideRotationX,
      rotationY: overrideRotationY,
      cornerRadius: overrideCornerRadius,
      opacity: overrideOpacity,
      size: {
        w: overrideW,
        h: overrideH,
      }
    };
  }, [layer]);

  useEffect(() => {
    if (activeState === previousState.current) {
      setValue({
        position: {
          y: layer.position.y,
          x: layer.position.x,
        },
        zPosition: layer.zPosition ?? 0,
        rotation: layer.rotation ?? 0,
        rotationX: layer.rotationX ?? 0,
        rotationY: layer.rotationY ?? 0,
        cornerRadius: layer.cornerRadius ?? 0,
        opacity: layer.opacity ?? 1,
        size: {
          w: layer.size.w,
          h: layer.size.h,
        },
      });
    }
  }, [activeState, layer]);

  useEffect(() => {
    if (activeState !== previousState.current) {
      setIsTransitioning(true);
      startTime.current = 0;
      startValue.current = value;
      previousState.current = activeState;
    }
  }, [activeState, value]);

  useEffect(() => {
    if (!isTransitioning) {
      setValue(targetValueRef.current);
      return;
    }

    const animate = () => {
      const now = Date.now();
      const deltaMS = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const targetValue = targetValueRef.current;

      if (startTime.current !== null) {
        startTime.current += deltaMS;
        const progress = Math.min(startTime.current / transitionDuration, 1);

        const lerp = (start: number, end: number) => start + (end - start) * progress;

        setValue({
          position: {
            y: lerp(startValue.current.position.y, targetValue.position.y),
            x: lerp(startValue.current.position.x, targetValue.position.x),
          },
          zPosition: lerp(startValue.current.zPosition, targetValue.zPosition),
          rotation: lerp(startValue.current.rotation, targetValue.rotation),
          rotationX: lerp(startValue.current.rotationX, targetValue.rotationX),
          rotationY: lerp(startValue.current.rotationY, targetValue.rotationY),
          cornerRadius: lerp(startValue.current.cornerRadius, targetValue.cornerRadius),
          opacity: lerp(startValue.current.opacity, targetValue.opacity),
          size: {
            w: lerp(startValue.current.size.w, targetValue.size.w),
            h: lerp(startValue.current.size.h, targetValue.size.h),
          },
        });

        if (progress >= 1) {
          startTime.current = null;
          setIsTransitioning(false);
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
    };

    lastTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isTransitioning]);

  return value;
}
