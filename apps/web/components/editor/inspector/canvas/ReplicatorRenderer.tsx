import { ReplicatorLayer } from "@/lib/ca/types";
import { LayerRenderer } from "./LayerRenderer";
import { useTimeline } from "@/context/TimelineContext";

export default function ReplicatorRenderer({
  layer,
  gyroX,
  gyroY,
  useGyroControls,
  transformOriginY,
  nextUseYUp,
  hiddenLayerIds,
  anchor,
}: {
  layer: ReplicatorLayer;
  gyroX: number;
  gyroY: number;
  useGyroControls: boolean;
  transformOriginY: number;
  nextUseYUp: boolean;
  hiddenLayerIds: Set<string>;
  anchor: { x: number; y: number };
}) {
  const { currentTime } = useTimeline();
  const replicator = layer as ReplicatorLayer;
  const instanceCount = replicator.instanceCount ?? 1;
  const instanceTranslation = replicator.instanceTranslation ?? { x: 0, y: 0, z: 0 };
  const instanceRotation = replicator.instanceRotation ?? 0;
  const instanceDelay = replicator.instanceDelay ?? 0;
  const replicatorFlipped = (replicator.geometryFlipped ?? 0) === 1;

  return (
    Array.from({ length: instanceCount }, (_, i) => {
      const translateX = instanceTranslation.x * i;
      const translateY = replicatorFlipped ? (instanceTranslation.y * i) : -(instanceTranslation.y * i);
      const translateZ = instanceTranslation.z * i;
      const rotationZ = instanceRotation * i;

      const shouldShow = instanceDelay === 0 || (currentTime / 1000) >= i * instanceDelay;
      return (
        <div
          key={`instance-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotate(${rotationZ}deg)`,
            transformOrigin: `${anchor.x * 100}% ${transformOriginY}%`,
            pointerEvents: i === 0 ? undefined : 'none',
            display: shouldShow ? undefined : 'none',
          }}
        >
          {layer.children?.map((c) => {
            return (
              <LayerRenderer
                key={c.id + `instance-${i}`}
                layer={c}
                useYUp={nextUseYUp}
                siblings={layer.children || []}
                disableHitTesting={i > 0}
                hiddenLayerIds={hiddenLayerIds}
                gyroX={gyroX}
                gyroY={gyroY}
                useGyroControls={useGyroControls}
                delayMs={instanceDelay * 1000 * i}
              />
            );
          })}
        </div>
      );
    })
  );
}
