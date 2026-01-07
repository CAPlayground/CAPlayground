import { AnyLayer } from "@/lib/ca/types";
import { useEditor } from "@/components/editor/editor-context";
import { AnimationTrackRow } from "./AnimationTrackRow";
import { hasLayerAnimations } from "@/lib/editor/layer-utils";

interface TimelineLayerTracksProps {
  layer: AnyLayer;
  pxPerSecond: number;
  timelineDuration: number;
  selectedId: string | null;
}

export function TimelineLayerTracks({
  layer,
  pxPerSecond,
  timelineDuration,
  selectedId,
}: TimelineLayerTracksProps) {
  const { updateLayer } = useEditor();
  const animations = (layer.animations ?? []).filter((a) => a.enabled !== false);
  const children = layer.children ?? [];

  const hasAnimations = animations.length > 0;
  const hasChildrenWithAnimations = children.some((child) => hasLayerAnimations(child));

  if (!hasAnimations && !hasChildrenWithAnimations) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="h-6 bg-gray-100/50 dark:bg-gray-800/50" />
      {animations.map((animation, idx) => (
        <AnimationTrackRow
          key={`${layer.id}-${animation.keyPath}-${idx}`}
          layer={layer}
          animation={animation}
          animationIndex={idx}
          pxPerSecond={pxPerSecond}
          timelineDuration={timelineDuration}
          updateLayer={updateLayer}
        />
      ))}
      {children.map((child) => (
        <TimelineLayerTracks
          key={child.id}
          layer={child}
          pxPerSecond={pxPerSecond}
          timelineDuration={timelineDuration}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
