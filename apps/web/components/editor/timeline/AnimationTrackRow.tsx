import { useState, useRef } from "react";
import { AnyLayer } from "@/lib/ca/types";
import { ANIMATION_COLORS } from "./constants";

interface AnimationTrackRowProps {
  layer: AnyLayer;
  animation: NonNullable<AnyLayer['animations']>[number];
  animationIndex: number;
  pxPerSecond: number;
  timelineDuration: number;
  updateLayer: (id: string, patch: Partial<AnyLayer>) => void;
}

export function AnimationTrackRow({
  layer,
  animation,
  animationIndex,
  pxPerSecond,
  timelineDuration,
  updateLayer,
}: AnimationTrackRowProps) {
  const baseDurationSec = animation.durationSeconds ?? 1;
  const speed = animation.speed ?? 1;
  const repeatDurationSec = animation.repeatDurationSeconds;
  const isInfinite = animation.infinite === 1;
  const isAutoreverse = animation.autoreverses === 1;

  const [localDuration, setLocalDuration] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startDurationRef = useRef(baseDurationSec);

  const durationSec = localDuration ?? baseDurationSec;
  const effectiveDuration = speed !== 0 ? durationSec / speed : durationSec;
  const cycleWidthPx = effectiveDuration * pxPerSecond;

  let repeatCount = 1;
  if (isInfinite) {
    repeatCount = Math.ceil(timelineDuration / effectiveDuration);
  } else if (repeatDurationSec) {
    repeatCount = Math.ceil(repeatDurationSec / durationSec);
  }

  const colorClass = ANIMATION_COLORS[animation.keyPath] ?? ANIMATION_COLORS.default;

  const snapToGrid = (value: number, snap: boolean) => {
    if (!snap) return value;
    return Math.round(value * 2) / 2;
  };

  const calculateNewDuration = (clientX: number, shiftKey: boolean) => {
    const deltaX = clientX - startXRef.current;
    const deltaEffective = deltaX / pxPerSecond;
    const deltaSec = deltaEffective * speed;
    let newDuration = Math.max(0.1, startDurationRef.current + deltaSec);
    newDuration = snapToGrid(newDuration, shiftKey);
    return Math.round(newDuration * 10) / 10;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startDurationRef.current = baseDurationSec;
    setLocalDuration(baseDurationSec);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setLocalDuration(calculateNewDuration(e.clientX, e.shiftKey));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;

    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }

    const newDuration = calculateNewDuration(e.clientX, e.shiftKey);
    setLocalDuration(null);

    const animations = [...(layer.animations ?? [])];
    animations[animationIndex] = { ...animations[animationIndex], durationSeconds: newDuration };
    updateLayer(layer.id, { animations });
  };

  const isDragging = localDuration !== null;

  return (
    <div className="relative h-6 bg-gray-50 dark:bg-gray-800/50">
      {Array.from({ length: repeatCount }).map((_, repeatIdx) => {
        const startX = repeatIdx * cycleWidthPx;
        const isFirst = repeatIdx === 0;

        const durationText = `${durationSec.toFixed(1)}s ${speed !== 1 ? `@ ${speed}x` : ''}`;
        return (
          <div
            key={repeatIdx}
            className={`absolute top-0.5 bottom-0.5 rounded-sm ${colorClass} opacity-70 hover:opacity-100 transition-opacity ${isFirst ? 'group touch-none' : ''}`}
            style={{
              left: startX,
              width: Math.max(cycleWidthPx, 2),
            }}
            title={`${animation.keyPath}: ${durationText}${speed !== 1 ? ` (${effectiveDuration.toFixed(1)}s)` : ''}${isAutoreverse ? ' (autoreverse)' : ''}${isInfinite ? ' (∞)' : repeatDurationSec ? ` × ${repeatCount}` : ''}`}
          >
            {isFirst && (
              <span className="absolute inset-0 flex items-center px-1 text-[10px] text-white font-medium select-none pointer-events-none overflow-hidden">
                <span className="truncate">{durationText}</span>
              </span>
            )}
            {isAutoreverse && repeatIdx % 2 === 1 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium select-none pointer-events-none overflow-hidden">
                <span className="truncate">← reverse</span>
              </span>
            )}
            {isFirst && (
              <div
                className="absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize bg-white/30 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity rounded-r-sm touch-none select-none"
                style={{ touchAction: 'none' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerEnter={() => setIsHovering(true)}
                onPointerLeave={() => setIsHovering(false)}
              />
            )}
            {isFirst && (isDragging || isHovering) && (
              <div className="absolute -top-6 right-0 translate-x-1/2 px-1.5 py-0.5 rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-medium whitespace-nowrap shadow-md pointer-events-none z-30">
                {effectiveDuration.toFixed(1)}s
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
