import { useRef, useCallback } from 'react';
import Moveable from 'react-moveable';
import { useEditor } from '../editor-context';

interface UseMoveablePointerDragOptions {
  layerId: string | null | undefined;
  moveableRef?: React.RefObject<Moveable | null>;
}

export function useMoveablePointerDrag({
  layerId,
  moveableRef,
}: UseMoveablePointerDragOptions) {
  const { selectLayer } = useEditor();
  const DRAG_THRESHOLD_PX = 6;
  const start = useRef<{ x: number; y: number; id: number | null }>({ x: 0, y: 0, id: null });
  const started = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.shiftKey || e.button === 1 || !layerId) return;

    e.stopPropagation();
    selectLayer(layerId);

    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    started.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [layerId, selectLayer]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (start.current.id !== e.pointerId || started.current) return;

    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
      started.current = true;
      moveableRef?.current?.dragStart(e.nativeEvent);
    }
  }, [moveableRef]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (start.current.id === e.pointerId) {
      start.current.id = null;
      started.current = false;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
