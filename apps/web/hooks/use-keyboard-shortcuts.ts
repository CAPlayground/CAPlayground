import { findSiblingsOf } from '@/components/editor/canvas-preview/utils/layerTree';
import { useEditor } from '@/components/editor/editor-context';
import { useEffect, RefObject } from 'react';

interface UseKeyboardShortcutsProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  baseOffsetX: number;
  baseOffsetY: number;
  fitScale: number;
  pan: { x: number; y: number };
  scale: number;
  userScale: number;
  setUserScale: (scale: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
}

export function useKeyboardShortcuts({
  canvasRef,
  baseOffsetX,
  baseOffsetY,
  fitScale,
  pan,
  scale,
  userScale,
  setUserScale,
  setPan,
}: UseKeyboardShortcutsProps) {
  const {
    doc,
    moveLayer,
    deleteLayer,
  } = useEditor();
  
  // Delete/Backspace - Delete selected layer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditable = !!((e.target as HTMLElement | null)?.isContentEditable);
      if (tag === 'input' || tag === 'textarea' || isEditable) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const curKey = doc?.activeCA ?? 'floating';
      const cur = doc?.docs?.[curKey];
      const selId = cur?.selectedId || null;
      if (!selId) return;
      e.preventDefault();
      deleteLayer(selId);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doc, deleteLayer]);

  // Cmd/Ctrl + [ ] - Layer ordering
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key;
      if (key !== ']' && key !== '[') return;
      const curKey = doc?.activeCA ?? 'floating';
      const cur = doc?.docs?.[curKey];
      const selId = cur?.selectedId || null;
      if (!cur || !selId) return;
      const res = findSiblingsOf(cur.layers || [], selId);
      if (!res) return;
      const { siblings, index } = res;
      const n = siblings.length;
      if (n <= 1) return;
      e.preventDefault();

      const bringForward = () => {
        if (index < n - 2) {
          moveLayer(selId, siblings[index + 2].id);
        } else if (index === n - 2) {
          moveLayer(siblings[n - 1].id, selId);
        }
      };
      const sendBackward = () => {
        if (index > 0) moveLayer(selId, siblings[index - 1].id);
      };
      const sendToBack = () => {
        if (index > 0) moveLayer(selId, siblings[0].id);
      };
      const bringToFront = () => {
        if (index < n - 1) {
          for (let i = index + 1; i < n; i++) moveLayer(siblings[i].id, selId);
        }
      };

      if (key === ']' && e.shiftKey) return bringToFront();
      if (key === '[' && e.shiftKey) return sendToBack();
      if (key === ']') return bringForward();
      if (key === '[') return sendBackward();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doc, moveLayer]);

  // Cmd/Ctrl + +/-/0 - Zoom controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key;
      if (key !== '=' && key !== '+' && key !== '-' && key !== '0') return;
      if (!canvasRef.current) return;
      e.preventDefault();

      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = rect.width / 2;
      const clientY = rect.height / 2;
      const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
      const worldY = (clientY - (baseOffsetY + pan.y)) / scale;

      if (key === '0') {
        setUserScale(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const direction = key === '-' ? -1 : 1;
      const nextUserScale = direction > 0
        ? Math.min(5, userScale * 1.1)
        : Math.max(0.2, userScale / 1.1);
      const nextScale = fitScale * nextUserScale;
      const nextPanX = clientX - worldX * nextScale - baseOffsetX;
      const nextPanY = clientY - worldY * nextScale - baseOffsetY;
      setUserScale(nextUserScale);
      setPan({ x: nextPanX, y: nextPanY });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [baseOffsetX, baseOffsetY, fitScale, pan, scale, userScale, setUserScale, setPan, canvasRef]);
}
