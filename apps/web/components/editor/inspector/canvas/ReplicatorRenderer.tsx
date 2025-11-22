import { AnyLayer, ReplicatorLayer } from "@/lib/ca/types";
import { LayerRenderer } from "./LayerRenderer";

export default function ReplicatorRenderer({
  layer,
  timeSec,
  gyroX,
  gyroY,
  useGyroControls,
  onEvalLayerAnimation,
  transformOriginY,
  nextUseYUp,
  assets,
  hiddenLayerIds,
  anchor,
}: {
  layer: ReplicatorLayer;
  timeSec: number;
  gyroX: number;
  gyroY: number;
  useGyroControls: boolean;
  onEvalLayerAnimation: (l: AnyLayer, t: number) => void;
  transformOriginY: number;
  nextUseYUp: boolean;
  assets?: Record<string, { dataURL?: string }>;
  hiddenLayerIds: Set<string>;
  anchor: { x: number; y: number };
}) {
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

      const shouldShow = instanceDelay === 0 || timeSec >= i * instanceDelay;

      const birthTime = i * instanceDelay;
      const instanceTime = Math.max(0, timeSec - birthTime);

      const animatedChildren = layer.children ? JSON.parse(JSON.stringify(layer.children)) as AnyLayer[] : [];
      if (shouldShow) {
        const walkAndAnimate = (arr: AnyLayer[]) => {
          for (const child of arr) {
            onEvalLayerAnimation(child, instanceTime);
            if (child.children?.length) {
              walkAndAnimate(child.children);
            }
          }
        };
        walkAndAnimate(animatedChildren);
      }

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
          {animatedChildren.map((c) => {
            return (
              <LayerRenderer
                key={c.id}
                layer={c}
                useYUp={nextUseYUp}
                siblings={animatedChildren}
                assets={assets}
                disableHitTesting={i > 0}
                hiddenLayerIds={hiddenLayerIds}
                timeSec={timeSec}
                gyroX={gyroX}
                gyroY={gyroY}
                useGyroControls={useGyroControls}
                onEvalLayerAnimation={onEvalLayerAnimation}
              />
            );
          })}
        </div>
      );
    })
  );
}
