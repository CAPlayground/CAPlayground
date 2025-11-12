import { useState, useRef } from 'react';

export function useCanvasPan() {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const panDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const startPan = (clientX: number, clientY: number) => {
    panDragRef.current = {
      startClientX: clientX,
      startClientY: clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    setIsPanning(true);
  };

  const updatePan = (clientX: number, clientY: number) => {
    const d = panDragRef.current;
    if (!d) return;
    
    const dx = clientX - d.startClientX;
    const dy = clientY - d.startClientY;
    setPan({ x: d.startPanX + dx, y: d.startPanY + dy });
  };

  const endPan = () => {
    panDragRef.current = null;
    setIsPanning(false);
  };

  const resetPan = () => setPan({ x: 0, y: 0 });

  return {
    pan,
    setPan,
    isPanning,
    setIsPanning,
    panDragRef,
    startPan,
    updatePan,
    endPan,
    resetPan,
  };
}
