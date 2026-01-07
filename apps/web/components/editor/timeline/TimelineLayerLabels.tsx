import { AnyLayer } from "@/lib/ca/types";
import { ANIMATION_COLORS } from "./constants";
import { hasLayerAnimations } from "@/lib/editor/layer-utils";

interface TimelineLayerLabelsProps {
  layer: AnyLayer;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function TimelineLayerLabels({
  layer,
  depth = 0,
  selectedId,
  onSelect,
}: TimelineLayerLabelsProps) {
  const animations = (layer.animations ?? []).filter((a) => a.enabled !== false);
  const children = layer.children ?? [];

  const hasAnimations = animations.length > 0;
  const hasChildrenWithAnimations = children.some((child) => hasLayerAnimations(child));

  if (!hasAnimations && !hasChildrenWithAnimations) return null;

  const indentPx = depth * 8;
  const isSelected = layer.id === selectedId;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div
        className={`flex items-center gap-1 px-1 h-6 cursor-pointer transition-colors ${isSelected
            ? 'bg-accent/20 dark:bg-accent/30'
            : 'bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}
        style={{ paddingLeft: `${4 + indentPx}px` }}
        onClick={() => onSelect(isSelected ? null : layer.id)}
      >
        <span
          className={`text-[9px] font-medium truncate ${isSelected ? 'text-accent-foreground dark:text-accent' : 'text-gray-700 dark:text-gray-300'
            }`}
          title={layer.name}
        >
          {layer.name}
        </span>
      </div>
      {animations.map((animation, idx) => {
        const colorClass = ANIMATION_COLORS[animation.keyPath] ?? ANIMATION_COLORS.default;

        return (
          <div
            key={`${layer.id}-${animation.keyPath}-${idx}`}
            className={`flex items-center gap-1 px-1 h-6 ${isSelected ? 'bg-accent/10' : ''}`}
            style={{ paddingLeft: `${12 + indentPx}px` }}
          >
            <span
              className={`text-[10px] truncate px-1 py-0.5`}
              title={animation.keyPath}
            >
              {animation.keyPath}
            </span>
            <span className={`w-2 h-2 rounded-sm ${colorClass}`} />
          </div>
        );
      })}
      {children.map((child) => (
        <TimelineLayerLabels
          key={child.id}
          layer={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
