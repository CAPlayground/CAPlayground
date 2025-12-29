import React, { useEffect, useRef } from 'react';
import {
  CAEmitterLayer, CAEmitterCell,
} from './emitter';
import { EmitterLayer } from '@/lib/ca/types';
import { useEditor } from '../editor-context';
import { useTimeline } from '@/context/TimelineContext';
import { useEmitterCellImages } from '@/hooks/use-asset-url';

export function EmitterCanvas({
  layer: emitterLayer,
}: {
  layer: EmitterLayer;
}) {
  const { doc } = useEditor();
  const { isPlaying } = useTimeline();
  const paused = !isPlaying;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number>(0);
  const runningRef = useRef(!paused);
  const layerRef = useRef<CAEmitterLayer>(null);
  const startAnimationRef = useRef<(() => void) | null>(null);
  
  const docHeight = doc?.meta.height ?? 0;
  const docWidth = doc?.meta.width ?? 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { cellImages } = useEmitterCellImages({
    cells: emitterLayer.emitterCells || [],
  });

  useEffect(() => {
    runningRef.current = !paused;
    const onVis = () => {
      if (document.visibilityState !== 'visible') {
        runningRef.current = false;
      } else {
        runningRef.current = !paused;
        if (!paused && layerRef.current && startAnimationRef.current) {
          startAnimationRef.current();
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);

    if (!paused && layerRef.current && startAnimationRef.current) {
      startAnimationRef.current();
    }

    return () => {
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [paused]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const geometryFlipped = emitterLayer.geometryFlipped === 1;
    if (geometryFlipped) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.setTransform(1, 0, 0, -1, 0, canvas.height);
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(
      0,
      geometryFlipped ? -emitterLayer.size.h : 0
    );
    const layer = new CAEmitterLayer();
    layer.emitterPosition = emitterLayer.emitterPosition;
    layer.emitterSize = emitterLayer.emitterSize;
    layer.emitterShape = emitterLayer.emitterShape || layer.emitterShape;
    layer.emitterMode = emitterLayer.emitterMode || layer.emitterMode;
    layer.geometryFlipped = !!emitterLayer.geometryFlipped;
    layer.renderMode = emitterLayer.renderMode || layer.renderMode;
    layerRef.current = layer;

    const loadCells = async () => {
      const cellPromises = emitterLayer.emitterCells?.map(async (cell) => {
        const img = cellImages.get(cell.id) || null;
        const newCell = new CAEmitterCell();
        newCell.name = cell.id;
        newCell.contents = img;
        newCell.birthRate = reduceMotion ? 0 : cell.birthRate;
        newCell.lifetime = cell.lifetime;
        newCell.velocity = cell.velocity;
        newCell.emissionRange = Math.PI * cell.emissionRange / 180;
        newCell.emissionLongitude = Math.PI * cell.emissionLongitude / 180;
        newCell.emissionLatitude = Math.PI * cell.emissionLatitude / 180;
        newCell.scale = cell.scale;
        newCell.scaleRange = cell.scaleRange;
        newCell.scaleSpeed = cell.scaleSpeed;
        newCell.alphaRange = cell.alphaRange;
        newCell.alphaSpeed = cell.alphaSpeed;
        newCell.spin = Math.PI * cell.spin / 180;
        newCell.spinRange = Math.PI * cell.spinRange / 180;
        newCell.yAcceleration = cell.yAcceleration || 0;
        newCell.xAcceleration = cell.xAcceleration || 0;
        return newCell;
      }) || [];

      const loadedCells = await Promise.all(cellPromises);
      layer.emitterCells.push(...loadedCells);

      if (runningRef.current) {
        startAnimation();
      }
    };

    const startAnimation = () => {
      cancelAnimationFrame(rafIdRef.current);

      let last = performance.now();

      const tick = (now: number) => {
        if (!runningRef.current) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        layerRef.current?.step(dt);
        layerRef.current?.draw(ctx);

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    };

    startAnimationRef.current = startAnimation;

    loadCells();

    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [
    JSON.stringify(emitterLayer.emitterCells),
    JSON.stringify(emitterLayer.emitterPosition),
    JSON.stringify(emitterLayer.emitterSize),
    emitterLayer.geometryFlipped,
    emitterLayer.size.h,
    emitterLayer.emitterShape,
    emitterLayer.emitterMode,
    emitterLayer.renderMode,
    cellImages,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={docWidth * 4}
      height={docHeight * 4}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: docWidth * 4,
        height: docHeight * 4,
        pointerEvents: 'none',
        background: 'transparent',
        transform: `translateX(-50%) translateY(50%)`,
      }}
    />
  );
}
