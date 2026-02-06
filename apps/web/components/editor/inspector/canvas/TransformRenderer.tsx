import { useMemo } from "react";
import { GyroParallaxDictionary, TransformLayer } from "@/lib/ca/types";
import { useEditor } from "../../editor-context";
import { radToDeg } from "@/lib/utils";

function mapRange(value: number, b1: number, b2: number) {
  const a1 = -1;
  const a2 = 1;
  return b1 + ((value - a1) * (b2 - b1)) / (a2 - a1);
}

type TransformConfig = {
  convert?: (v: number) => number;
  invertInput?: boolean;
  invertOutput?: boolean;
  defaultValue: number | null;
};

const TRANSFORM_CONFIGS: Record<string, TransformConfig> = {
  'transform.rotation.x': { convert: radToDeg, invertInput: true, defaultValue: 0 },
  'transform.rotation.y': { convert: radToDeg, defaultValue: 0 },
  'transform.rotation.z': { convert: radToDeg, invertOutput: true, defaultValue: 0 },
  'transform.translation.x': { defaultValue: 0 },
  'transform.translation.y': { invertOutput: true, defaultValue: 0 },
  'position.x': { defaultValue: null },
  'position.y': { defaultValue: null },
  'anchorPoint.x': { defaultValue: null },
  'anchorPoint.y': { defaultValue: null },
};

function computeDelta(
  transform: GyroParallaxDictionary | undefined,
  gyroX: number,
  gyroY: number,
  config: TransformConfig
): number | null {
  if (!transform) return config.defaultValue;
  let gyroValue = transform.axis === 'x' ? gyroX : gyroY;
  if (config.invertInput) gyroValue = -gyroValue;
  let result = mapRange(gyroValue, transform.mapMinTo, transform.mapMaxTo);
  if (config.convert) result = config.convert(result);
  if (config.invertOutput) result = -result;
  return result;
}

export function useTransform({
  layer,
  useGyroControls,
  gyroX,
  gyroY,
}: {
  layer: TransformLayer;
  useGyroControls: boolean;
  gyroX: number;
  gyroY: number;
}) {
  const { doc } = useEditor();
  const currentKey = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[currentKey];

  const parallaxTransforms = current?.wallpaperParallaxGroups?.filter(
    (g) => g.layerName === layer.name
  );

  const getTransform = (keyPath: string) =>
    parallaxTransforms?.find((g) => g.keyPath === keyPath);

  const deltas = useMemo(() => {
    const result: Record<string, number | null> = {};
    for (const [keyPath, config] of Object.entries(TRANSFORM_CONFIGS)) {
      result[keyPath] = computeDelta(getTransform(keyPath), gyroX, gyroY, config);
    }
    return result;
  }, [parallaxTransforms, gyroX, gyroY]);

  if (!useGyroControls) return {};

  const rotationXDelta = deltas['transform.rotation.x'] ?? 0;
  const rotationYDelta = deltas['transform.rotation.y'] ?? 0;
  const rotationZDelta = deltas['transform.rotation.z'] ?? 0;
  const translationXDelta = deltas['transform.translation.x'] ?? 0;
  const translationYDelta = deltas['transform.translation.y'] ?? 0;

  const transformString = [
    `translateX(${translationXDelta}px)`,
    `translateY(${translationYDelta}px)`,
    rotationYDelta !== 0 && `rotate3d(0, 1, 0, ${(layer.rotationY ?? 0) + rotationYDelta}deg)`,
    rotationXDelta !== 0 && `rotateX(${(layer.rotationX ?? 0) + rotationXDelta}deg)`,
    rotationZDelta !== 0 && `rotateZ(${(layer.rotation ?? 0) + rotationZDelta}deg)`,
  ].filter(Boolean).join(' ');

  return {
    transformString,
    transformedX: deltas['position.x'],
    transformedY: deltas['position.y'],
    transformedAnchorX: deltas['anchorPoint.x'],
    transformedAnchorY: deltas['anchorPoint.y'],
  };
}
