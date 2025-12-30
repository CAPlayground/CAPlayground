import { TransformLayer } from "@/lib/ca/types";
import { useEditor } from "../../editor-context";
import { useEffect, useState } from "react";

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

  function mapRange(value: number, b1: number, b2: number) {
    const a1 = -1;
    const a2 = 1;
    return b1 + ((value - a1) * (b2 - b1)) / (a2 - a1);
  }
  const parallaxTransform = current?.wallpaperParallaxGroups?.filter((g: any) => g.layerName === layer.name)
  const radToDeg = (rad: number) => rad * (180 / Math.PI);
  const transformRotationX = parallaxTransform?.filter((g: any) => g.keyPath === 'transform.rotation.x')[0]
  const transformRotationY = parallaxTransform?.filter((g: any) => g.keyPath === 'transform.rotation.y')[0]
  const transformTranslationX = parallaxTransform?.filter((g: any) => g.keyPath === 'transform.translation.x')[0]
  const transformTranslationY = parallaxTransform?.filter((g: any) => g.keyPath === 'transform.translation.y')[0]
  const transformPositionX = parallaxTransform?.filter(g => g.keyPath === 'position.x')[0];
  const transformPositionY = parallaxTransform?.filter(g => g.keyPath === 'position.y')[0];

  let rotationXDelta = 0;
  let rotationYDelta = 0;
  let translationXDelta = 0;
  let translationYDelta = 0;
  let positionXDelta = null;
  let positionYDelta = null;

  if (transformRotationX) {
    let gyroValue = transformRotationX.axis === 'x' ? gyroX : gyroY;
    gyroValue = -gyroValue;
    const targetValue = mapRange(gyroValue, transformRotationX.mapMinTo, transformRotationX.mapMaxTo)
    rotationXDelta = radToDeg(targetValue);
  }

  if (transformRotationY) {
    let gyroValue = transformRotationY.axis === 'x' ? gyroX : gyroY;
    gyroValue = -gyroValue;
    const targetValue = mapRange(gyroValue, transformRotationY.mapMinTo, transformRotationY.mapMaxTo)
    rotationYDelta = radToDeg(targetValue);
  }

  if (transformTranslationX) {
    const gyroValue = transformTranslationX.axis === 'x' ? gyroX : gyroY;
    const targetValue = mapRange(gyroValue, transformTranslationX.mapMinTo, transformTranslationX.mapMaxTo)
    translationXDelta = -targetValue;
  }

  if (transformTranslationY) {
    const gyroValue = transformTranslationY.axis === 'x' ? gyroX : gyroY;
    const targetValue = mapRange(gyroValue, transformTranslationY.mapMinTo, transformTranslationY.mapMaxTo)
    translationYDelta = -targetValue;
  }

  if (transformPositionX) {
    let gyroValue = transformPositionX.axis === 'x' ? gyroX : gyroY;
    if (transformPositionX.mapMinTo > transformPositionX.mapMaxTo) {
      gyroValue = -gyroValue;
    }
    const targetValue = mapRange(gyroValue, transformPositionX.mapMinTo, transformPositionX.mapMaxTo);
    positionXDelta = targetValue;
  }

  if (transformPositionY) {
    const gyroValue = transformPositionY.axis === 'x' ? gyroX : gyroY;
    const targetValue = mapRange(gyroValue, transformPositionY.mapMinTo, transformPositionY.mapMaxTo);
    positionYDelta = targetValue;
  }

  
  let transformString = '';
  let transformedX = null;
  let transformedY = null;
  const e = { ...layer } as TransformLayer;
  if (useGyroControls) {
    if (positionXDelta !== null) {
      transformedX = positionXDelta;
    }
    if (positionYDelta !== null) {
      transformedY = positionYDelta;
    }
    let transforms = [
      `translateX(${translationXDelta}px)`,
      `translateY(${translationYDelta}px)`,
    ]
    if (rotationYDelta !== 0) {
      transforms.push(`rotate3d(0, 1, 0, ${(e.rotationY ?? 0) + rotationYDelta}deg)`);
    }
    if (rotationXDelta !== 0) {
      transforms.push(`rotateX(${(e.rotationX ?? 0) + rotationXDelta}deg)`);
    }
    transformString = transforms.join(' ');
  }
  return {
    transformString,
    transformedX,
    transformedY,
  };
}
