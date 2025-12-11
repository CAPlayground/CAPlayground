import { useMemo } from "react";
import { useTimeline } from "@/context/TimelineContext";
import { Animation, Vec2, Size } from "@/lib/ca/types";

type KeyframeValue = number | Vec2 | Size;

const linear = (t: number) => t;

function interpolateKeyframe(
  keyframes: KeyframeValue[],
  reverse: boolean,
  durationMs: number,
  speed: number,
  delayMs: number,
  currentTime: number
): KeyframeValue {
  if (!keyframes || keyframes.length < 2) {
    return keyframes[0] ?? 0;
  }

  const path = !reverse
    ? keyframes.slice()
    : [...keyframes, ...keyframes.slice(0, -1).reverse()];

  if (currentTime < delayMs) {
    return path[0];
  }

  const forwardCount = keyframes.length - 1;
  const segmentDuration = durationMs / forwardCount;
  const segDur = !reverse
    ? Array(forwardCount).fill(segmentDuration)
    : [...Array(forwardCount).fill(segmentDuration), ...Array(forwardCount).fill(segmentDuration).reverse()];

  const totalMs = segDur.reduce((a, b) => a + b, 0);
  const effectiveSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const tGlobal = (currentTime - delayMs) * effectiveSpeed;
  const adjustedTime = tGlobal % totalMs;

  let t = adjustedTime;
  let segIndex = 0;
  while (segIndex < segDur.length && t >= segDur[segIndex]) {
    t -= segDur[segIndex];
    segIndex++;
  }
  segIndex = Math.min(segIndex, segDur.length - 1);

  const a = path[segIndex];
  const b = path[segIndex + 1];
  const u = linear(segDur[segIndex] ? t / segDur[segIndex] : 0);

  if (typeof a === "number" && typeof b === "number") {
    return a + (b - a) * u;
  } else if ("x" in (a as any) && "x" in (b as any)) {
    const va = a as Vec2;
    const vb = b as Vec2;
    return {
      x: va.x + (vb.x - va.x) * u,
      y: va.y + (vb.y - va.y) * u,
    };
  } else {
    const va = a as Size;
    const vb = b as Size;
    return {
      w: va.w + (vb.w - va.w) * u,
      h: va.h + (vb.h - va.h) * u,
    };
  }
}

export default function useLayerAnimations(
  animations: Animation[] | undefined,
  delayMs: number = 0
): Record<string, number> {
  const { currentTime } = useTimeline();

  const animationOverrides = useMemo(() => {
    const overrides: Record<string, number> = {};

    if (!animations || animations.length === 0) {
      return overrides;
    }

    animations.forEach((anim) => {
      if (!anim.enabled || !anim.keyPath || !anim.values || anim.values.length === 0) {
        return;
      }

      const animation = interpolateKeyframe(
        anim.values,
        anim.autoreverses === 1,
        (anim.durationSeconds ?? 0) * 1000,
        anim.speed ?? 1,
        delayMs,
        currentTime
      );

      if (anim.keyPath === 'position') {
        overrides['position.x'] = (animation as Vec2).x;
        overrides['position.y'] = (animation as Vec2).y;
      } else if (anim.keyPath === 'bounds') {
        overrides['bounds.size.width'] = (animation as Size).w;
        overrides['bounds.size.height'] = (animation as Size).h;
      } else {
        overrides[anim.keyPath] = animation as number;
      }
    });

    return overrides;
  }, [animations, currentTime, delayMs]);

  return animationOverrides;
}
