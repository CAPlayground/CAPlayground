import React, { useEffect, useRef } from 'react';
import {
  CAEmitterLayer, CAEmitterCell,
} from './emitter';
import { EmitterLayer } from '@/lib/ca/types';

const loadImage = (src: string) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export function EmitterCanvas({
  paused = false,
  layer: emitterLayer,
  assets,
  left,
  top,
  docWidth,
  docHeight,
}: {
  paused?: boolean;
  layer: EmitterLayer;
  assets?: Record<string, { dataURL?: string }>;
  left: number;
  top: number;
  docWidth: number;
  docHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number>(0);
  const runningRef = useRef(!paused);
  const layerRef = useRef<CAEmitterLayer>(null);
  const startAnimationRef = useRef<(() => void) | null>(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    ctx.translate(
      emitterLayer.position.x,
      geometryFlipped ? canvas.height - emitterLayer.position.y : emitterLayer.position.y
    );
    ctx.rotate(Math.PI * (emitterLayer.rotation || 0) / 180 * (geometryFlipped ? -1 : 1));
    ctx.translate(
      -emitterLayer.size.w / 2,
      -emitterLayer.size.h / 2
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
        const src = assets?.[cell.id]?.dataURL;
        const img = src ? await loadImage(src) : null;
        const newCell = new CAEmitterCell();
        newCell.name = cell.id;
        newCell.contents = img;
        newCell.birthRate = reduceMotion ? 0 : cell.birthRate;
        newCell.lifetime = cell.lifetime;
        newCell.velocity = cell.velocity;
        newCell.emissionRange = Math.PI * cell.emissionRange / 180;
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
  }, [JSON.stringify(emitterLayer)]);

  return (
    <div
      style={{
        width: emitterLayer.size.w,
        height: emitterLayer.size.h,
        transform: `rotate(${emitterLayer.rotation}deg)`,
        transformOrigin: '50% 50% 0',
      }}
    >
      <canvas
        ref={canvasRef}
        width={docWidth}
        height={docHeight}
        style={{
          width: docWidth,
          height: docHeight,
          position: 'absolute',
          pointerEvents: 'none',
          background: 'transparent',
          left: -left,
          top: -top,
        }}
      />
    </div>
  );
}
