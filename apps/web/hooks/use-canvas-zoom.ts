import { useEffect, useState, RefObject } from 'react';

export function useCanvasZoom(ref: RefObject<HTMLDivElement | null>) {
  const [userScale, setUserScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    el.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [ref]);

  const zoomIn = () => setUserScale((s) => Math.min(s + 0.1, 5));
  const zoomOut = () => setUserScale((s) => Math.max(s - 0.1, 0.1));
  const resetZoom = () => setUserScale(1);

  return {
    userScale,
    setUserScale,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
