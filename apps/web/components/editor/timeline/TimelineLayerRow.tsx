import { AnyLayer } from "@/lib/ca/types";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useState, useRef } from "react";
import { useEditor } from "@/components/editor/editor-context";
import { ANIMATION_COLORS } from "./constants";
import { hasLayerAnimations } from "@/lib/editor/layer-utils";

interface TimelineLayerRowProps {
  layer: AnyLayer;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  pxPerSecond: number;
  timelineDuration: number;
  labelWidth: number;
  trackWidth: number;
}

export function TimelineLayerRow({
  layer,
  depth = 0,
  selectedId,
  onSelect,
  collapsedIds,
  onToggleCollapse,
  pxPerSecond,
  timelineDuration,
  labelWidth,
  trackWidth,
}: TimelineLayerRowProps) {
  const { updateLayer } = useEditor();
  const animations = (layer.animations ?? []).filter((a) => a.enabled !== false);
  const children = layer.children ?? [];

  const hasAnimations = animations.length > 0;
  const hasChildrenWithAnimations = children.some((child) => hasLayerAnimations(child));

  if (!hasAnimations && !hasChildrenWithAnimations) return null;

  const indentPx = depth * 8;
  const isSelected = layer.id === selectedId;
  const isCollapsed = collapsedIds.has(layer.id);
  const isCollapsible = hasAnimations || hasChildrenWithAnimations;

  return (
    <>
      <div className="flex h-6">
        <div
          className="sticky left-0 z-10 shrink-0 bg-gray-100 dark:bg-gray-800 overflow-hidden"
          style={{ width: labelWidth }}
        >
          <div
            className={`h-full flex items-center gap-0.5 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${isSelected
                ? 'bg-accent/20 dark:bg-accent/30 border-l-2 border-l-accent'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            style={{ paddingLeft: `${2 + indentPx}px` }}
            onClick={() => !isSelected && onSelect(layer.id)}
          >
            {isCollapsible && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(layer.id);
                }}
                className="shrink-0 hover:bg-accent/50 rounded p-0.5"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
            <span
              className={`text-[9px] font-medium truncate min-w-0 ${isSelected ? 'text-accent-foreground dark:text-accent' : 'text-gray-700 dark:text-gray-300'}`}
              title={layer.name}
            >
              {layer.name}
            </span>
          </div>
        </div>
        <div
          className="border-b border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50"
          style={{ width: trackWidth }}
        />
      </div>

      {!isCollapsed &&
        animations.map((animation, idx) => (
          <AnimationRow
            key={`${layer.id}-${animation.keyPath}-${idx}`}
            layer={layer}
            animation={animation}
            animationIndex={idx}
            depth={depth}
            isSelected={isSelected}
            labelWidth={labelWidth}
            trackWidth={trackWidth}
            pxPerSecond={pxPerSecond}
            timelineDuration={timelineDuration}
            updateLayer={updateLayer}
          />
        ))}

      {!isCollapsed &&
        children.map((child) => (
          <TimelineLayerRow
            key={child.id}
            layer={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            collapsedIds={collapsedIds}
            onToggleCollapse={onToggleCollapse}
            pxPerSecond={pxPerSecond}
            timelineDuration={timelineDuration}
            labelWidth={labelWidth}
            trackWidth={trackWidth}
          />
        ))}
    </>
  );
}

function AnimationRow({
  layer,
  animation,
  animationIndex,
  depth,
  isSelected,
  labelWidth,
  trackWidth,
  pxPerSecond,
  timelineDuration,
  updateLayer,
}: {
  layer: AnyLayer;
  animation: NonNullable<AnyLayer['animations']>[number];
  animationIndex: number;
  depth: number;
  isSelected: boolean;
  labelWidth: number;
  trackWidth: number;
  pxPerSecond: number;
  timelineDuration: number;
  updateLayer: (id: string, patch: Partial<AnyLayer>) => void;
}) {
  const indentPx = depth * 8;
  const colorClass = ANIMATION_COLORS[animation.keyPath] ?? ANIMATION_COLORS.default;

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
  const durationText = `${durationSec.toFixed(1)}s${speed !== 1 ? ` @ ${speed}x` : ''}`;

  return (
    <div className="flex h-6">
      <div
        className="sticky left-0 z-10 shrink-0 bg-white dark:bg-gray-900 overflow-hidden"
        style={{ width: labelWidth }}
      >
        <div
          className={`h-full flex items-center gap-1 pr-1 border-r border-b border-gray-200 dark:border-gray-700 ${isSelected ? 'bg-accent/10 dark:bg-accent/20 border-l-2 border-l-accent' : ''}`}
          style={{ paddingLeft: `${16 + indentPx}px` }}
        >
          <span className={`w-2 h-2 shrink-0 rounded-sm ${colorClass}`} />
          <span className="text-[10px] truncate min-w-0" title={animation.keyPath}>
            {animation.keyPath}
          </span>
        </div>
      </div>
      <div
        className="relative border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        style={{ width: trackWidth }}
      >
        {Array.from({ length: repeatCount }).map((_, repeatIdx) => {
          const startX = repeatIdx * cycleWidthPx;
          const isFirst = repeatIdx === 0;

          return (
            <div
              key={repeatIdx}
              className={`absolute top-0.5 bottom-0.5 rounded-sm ${colorClass} opacity-70 hover:opacity-100 transition-opacity ${isFirst ? 'group touch-none' : ''
                }`}
              style={{ left: startX, width: Math.max(cycleWidthPx, 2) }}
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
    </div>
  );
}
