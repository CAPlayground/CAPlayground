import { useMemo } from "react";
import { useTimeline } from "@/context/TimelineContext";
import { Vec2, Size } from "@/lib/ca/types";

type KeyframeValue = number | Vec2 | Size;

type UseKeyframesOpts = {
  keyframes: KeyframeValue[];
  reverse: boolean;
  paused?: boolean;
  durationMs?: number;
  segmentDurationsMs?: number[];
  ease?: (t: number) => number;
  delayMs?: number;
  speed?: number;
};

const linear = (t: number) => t;

export default function useKeyframeAnimation({
  keyframes,
  reverse,
  paused = false,
  durationMs = 1000,
  segmentDurationsMs,
  ease = linear,
  delayMs = 0,
  speed = 1,
}: UseKeyframesOpts) {
  const { currentTime } = useTimeline();

  const path = useMemo(() => {
    if (!keyframes || keyframes.length < 2) {
      const first = keyframes[0] ?? 0;
      return [first, first];
    }
    if (!reverse) return keyframes.slice();
    return [...keyframes, ...keyframes.slice(0, -1).reverse()];
  }, [keyframes, reverse]) as KeyframeValue[];

  const segDur = useMemo(() => {
    const forwardCount = keyframes.length - 1;
    if (forwardCount <= 0) return [1];

    let forwardDur: number[];
    if (segmentDurationsMs && segmentDurationsMs.length === forwardCount) {
      forwardDur = segmentDurationsMs.slice();
    } else {
      const each = durationMs / forwardCount;
      forwardDur = Array(forwardCount).fill(each);
    }

    if (!reverse) return forwardDur;

    const reverseDur = forwardDur.slice().reverse();
    return [...forwardDur, ...reverseDur];
  }, [keyframes, reverse, durationMs, segmentDurationsMs]);

  const totalMs = useMemo(
    () => segDur.reduce((a, b) => a + b, 0),
    [segDur]
  );

  const value = useMemo(() => {
    if (paused || path.length < 2) {
      return path[0] ?? 0;
    }

    if (currentTime < delayMs) {
      return path[0];
    }

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
    const u = ease(segDur[segIndex] ? t / segDur[segIndex] : 0);

    let out: KeyframeValue;

    if (typeof a === "number" && typeof b === "number") {
      out = a + (b - a) * u;
    } else if ("x" in (a as any) && "x" in (b as any)) {
      const va = a as Vec2;
      const vb = b as Vec2;
      out = {
        x: va.x + (vb.x - va.x) * u,
        y: va.y + (vb.y - va.y) * u,
      };
    } else {
      const va = a as Size;
      const vb = b as Size;
      out = {
        w: va.w + (vb.w - va.w) * u,
        h: va.h + (vb.h - va.h) * u,
      };
    }

    return out;
  }, [currentTime, paused, path, segDur, ease, delayMs, totalMs, speed]);

  return value;
}