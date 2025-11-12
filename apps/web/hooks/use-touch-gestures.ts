import { useRef, RefObject } from 'react';
import type { TouchEvent, WheelEvent } from 'react';

interface UseTouchGesturesProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  baseOffsetX: number;
  baseOffsetY: number;
  fitScale: number;
  pan: { x: number; y: number };
  scale: number;
  userScale: number;
  setUserScale: (scale: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  pinchZoomSensitivity: number;
}

export function useTouchGestures({
  canvasRef,
  baseOffsetX,
  baseOffsetY,
  fitScale,
  pan,
  scale,
  userScale,
  setUserScale,
  setPan,
  pinchZoomSensitivity,
}: UseTouchGesturesProps) {
  
  const touchGestureRef = useRef<{
    startUserScale: number;
    startPanX: number;
    startPanY: number;
    startDist: number;
    startCenterX: number;
    startCenterY: number;
  } | null>(null);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    // pinch-to-zoom via ctrl+wheel, or shift+scroll
    if (e.ctrlKey || e.shiftKey) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
      const worldY = (clientY - (baseOffsetY + pan.y)) / scale;
      const factor = Math.exp(-e.deltaY * 0.001 * pinchZoomSensitivity);
      const nextUserScale = Math.min(5, Math.max(0.2, userScale * factor));
      const nextScale = fitScale * nextUserScale;
      const nextPanX = clientX - worldX * nextScale - baseOffsetX;
      const nextPanY = clientY - worldY * nextScale - baseOffsetY;
      setUserScale(nextUserScale);
      setPan({ x: nextPanX, y: nextPanY });
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
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
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const g = touchGestureRef.current;
    if (!canvasRef.current || !g) return;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const cx = (t1.clientX + t2.clientX) / 2 - rect.left;
      const cy = (t1.clientY + t2.clientY) / 2 - rect.top;
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.hypot(dx, dy);
      const rawFactor = dist / Math.max(1, g.startDist);

      const v = pinchZoomSensitivity;
      const lowSensitivity = 0.5;
      const normalizedV = (v - 1.25) / 0.75;
      const effectiveSensitivity = lowSensitivity * (2 * normalizedV * normalizedV + 1);

      const factor = 1 + (rawFactor - 1) * effectiveSensitivity;
      const nextUserScale = Math.min(5, Math.max(0.2, g.startUserScale * factor));
      const nextScale = fitScale * nextUserScale;
      const worldX = (g.startCenterX - (baseOffsetX + g.startPanX)) / (fitScale * g.startUserScale);
      const worldY = (g.startCenterY - (baseOffsetY + g.startPanY)) / (fitScale * g.startUserScale);
      const nextPanX = cx - worldX * nextScale - baseOffsetX;
      const nextPanY = cy - worldY * nextScale - baseOffsetY;
      setUserScale(nextUserScale);
      setPan({ x: nextPanX, y: nextPanY });
    }
  };

  const handleTouchEnd = () => {
    touchGestureRef.current = null;
  };

  const handleTouchCancel = () => {
    touchGestureRef.current = null;
  };

  return {
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
}
