import { useEffect, useState, RefObject } from 'react';

export function useCanvasSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
