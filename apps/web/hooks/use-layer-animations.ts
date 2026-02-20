import { useMemo } from "react";
import { useTimeline } from "@/context/TimelineContext";
import { Animation, Vec2, Size, CalculationMode, TimingFunction, GradientColor } from "@/lib/ca/types";

type KeyframeValue = number | Vec2 | Size | string | GradientColor[];

function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
  const NEWTON_ITERATIONS = 4;
  const NEWTON_MIN_SLOPE = 0.001;
  const SUBDIVISION_PRECISION = 0.0000001;
  const SUBDIVISION_MAX_ITERATIONS = 10;

  const ax = 1.0 - 3.0 * p2x + 3.0 * p1x;
  const bx = 3.0 * p2x - 6.0 * p1x;
  const cx = 3.0 * p1x;

  const ay = 1.0 - 3.0 * p2y + 3.0 * p1y;
  const by = 3.0 * p2y - 6.0 * p1y;
  const cy = 3.0 * p1y;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3.0 * ax * t + 2.0 * bx) * t + cx;

  const solveCurveX = (x: number): number => {
    let t2 = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const slope = sampleCurveDerivativeX(t2);
      if (Math.abs(slope) < NEWTON_MIN_SLOPE) break;
      const currentX = sampleCurveX(t2) - x;
      t2 -= currentX / slope;
    }

    let t0 = 0.0;
    let t1 = 1.0;
    t2 = x;

    if (t2 < t0) return t0;
    if (t2 > t1) return t1;

    for (let i = 0; i < SUBDIVISION_MAX_ITERATIONS; i++) {
      const currentX = sampleCurveX(t2);
      if (Math.abs(currentX - x) < SUBDIVISION_PRECISION) return t2;
      if (x > currentX) {
        t0 = t2;
      } else {
        t1 = t2;
      }
      t2 = (t1 - t0) * 0.5 + t0;
    }

    return t2;
  };

  return (x: number) => {
    if (p1x === p1y && p2x === p2y) return x;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleCurveY(solveCurveX(x));
  };
}

const timingFunctions: Record<TimingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeIn: cubicBezier(0.42, 0, 1.0, 1.0),
  easeOut: cubicBezier(0, 0, 0.58, 1.0),
  easeInEaseOut: cubicBezier(0.42, 0, 0.58, 1.0),
};

function buildKeyTimes(count: number, customKeyTimes?: number[], discrete: boolean = false): number[] {
  if (customKeyTimes && customKeyTimes.length === count) {
    return customKeyTimes;
  }
  if (discrete) {
    // For discrete mode, each keyframe should have equal display time
    // So keyTimes are [0, 1/N, 2/N, ...] not [0, ..., 1]
    return Array.from({ length: count }, (_, i) => i / count);
  }
  return Array.from({ length: count }, (_, i) => i / (count - 1));
}

function interpolateKeyframe(
  keyframes: KeyframeValue[],
  autoreverses: boolean,
  durationMs: number,
  speed: number,
  delayMs: number,
  currentTime: number,
  infinite: boolean,
  repeatDurationMs: number | undefined,
  calculationMode: CalculationMode = 'linear',
  timingFunction: TimingFunction = 'linear',
  keyTimes?: number[]
): KeyframeValue | null {
  if (!keyframes || keyframes.length < 2) {
    return (keyframes[0] as KeyframeValue) ?? 0;
  }

  const isDiscrete = calculationMode === 'discrete';
  const forwardKeyTimes = buildKeyTimes(keyframes.length, keyTimes, isDiscrete);

  if (currentTime < delayMs) {
    return keyframes[0];
  }

  const cycleMs = autoreverses ? durationMs * 2 : durationMs;
  const effectiveSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const tGlobal = (currentTime - delayMs) * effectiveSpeed;

  let adjustedTime: number;
  if (infinite) {
    adjustedTime = tGlobal % cycleMs;
  } else if (repeatDurationMs !== undefined && repeatDurationMs > 0) {
    if (tGlobal >= repeatDurationMs) {
      return null;
    }
    adjustedTime = tGlobal % cycleMs;
  } else {
    if (tGlobal >= cycleMs) {
      return null;
    }
    adjustedTime = tGlobal;
  }

  const easing = timingFunctions[timingFunction] || timingFunctions.linear;

  let easedKeyTime: number;
  let path: KeyframeValue[];
  let pathKeyTimes: number[];

  if (!autoreverses) {
    const normalizedTime = adjustedTime / durationMs;
    easedKeyTime = easing(Math.max(0, Math.min(1, normalizedTime)));
    path = keyframes;
    pathKeyTimes = forwardKeyTimes;
  } else {
    const inForwardHalf = adjustedTime < durationMs;

    if (inForwardHalf) {
      const localTime = adjustedTime / durationMs;
      easedKeyTime = easing(Math.max(0, Math.min(1, localTime)));
    } else {
      const localTime = (adjustedTime - durationMs) / durationMs;
      easedKeyTime = easing(Math.max(0, Math.min(1, 1 - localTime)));
    }
    path = keyframes;
    pathKeyTimes = forwardKeyTimes;
  }

  if (calculationMode === 'discrete') {
    let discreteIndex = path.length - 1;
    for (let i = path.length - 1; i >= 0; i--) {
      if (easedKeyTime >= pathKeyTimes[i]) {
        discreteIndex = i;
        break;
      }
    }
    return path[discreteIndex];
  }

  let segIndex = 0;
  while (segIndex < pathKeyTimes.length - 1 && easedKeyTime >= pathKeyTimes[segIndex + 1]) {
    segIndex++;
  }
  segIndex = Math.min(segIndex, path.length - 2);

  const a = path[segIndex];
  const b = path[segIndex + 1];

  const segStart = pathKeyTimes[segIndex];
  const segEnd = pathKeyTimes[segIndex + 1];
  const segDuration = segEnd - segStart;
  const segProgress = segDuration > 0 ? (easedKeyTime - segStart) / segDuration : 0;

  const u = Math.max(0, Math.min(1, segProgress));

  if (Array.isArray(a) && Array.isArray(b)) {
    if ((calculationMode as string) === 'discrete') return u < 0.5 ? a : b;
    const stopsA = a as GradientColor[];
    const stopsB = b as GradientColor[];
    const count = Math.min(stopsA.length, stopsB.length);
    const hexToRgb = (hex: string): [number, number, number] => {
      const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
      if (!m) return [0, 0, 0];
      let h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    return Array.from({ length: count }, (_, i) => {
      const sa = stopsA[i]; const sb = stopsB[i];
      const [r1, g1, b1] = hexToRgb(sa.color); const [r2, g2, b2] = hexToRgb(sb.color);
      const r = Math.round(r1 + (r2 - r1) * u);
      const g = Math.round(g1 + (g2 - g1) * u);
      const bv = Math.round(b1 + (b2 - b1) * u);
      const hex = '#' + [r, g, bv].map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
      const opacity = sa.opacity + (sb.opacity - sa.opacity) * u;
      return { color: hex, opacity };
    }) as GradientColor[];
  } else if (typeof a === 'string' || typeof b === 'string') {
    if ((calculationMode as string) === 'discrete') {
      return u < 0.5 ? a : b;
    }
    const hexToRgb = (hex: string): [number, number, number] => {
      const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
      if (!m) return [0, 0, 0];
      let h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    if (typeof a === 'string' && typeof b === 'string') {
      const [r1, g1, b1] = hexToRgb(a); const [r2, g2, b2] = hexToRgb(b);
      const r = Math.round(r1 + (r2 - r1) * u);
      const g = Math.round(g1 + (g2 - g1) * u);
      const bv = Math.round(b1 + (b2 - b1) * u);
      return '#' + [r, g, bv].map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
    }
    return u < 0.5 ? a : b;
  } else if (typeof a === 'number' && typeof b === 'number') {
    return a + (b - a) * u;
  } else if ('x' in (a as any) && 'x' in (b as any)) {
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
): Record<string, any> {
  const { currentTime } = useTimeline();

  const animationOverrides = useMemo(() => {
    const overrides: Record<string, any> = {};

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
        currentTime,
        anim.infinite === 1,
        anim.repeatDurationSeconds !== undefined ? anim.repeatDurationSeconds * 1000 : undefined,
        anim.calculationMode ?? 'linear',
        anim.timingFunction ?? 'linear',
        anim.keyTimes
      );

      if (animation === null) {
        return;
      }

      if (anim.keyPath === 'position') {
        overrides['position.x'] = (animation as Vec2).x;
        overrides['position.y'] = (animation as Vec2).y;
      } else if (anim.keyPath === 'bounds') {
        overrides['bounds.size.width'] = (animation as Size).w;
        overrides['bounds.size.height'] = (animation as Size).h;
      } else if (anim.keyPath === 'colors') {
        overrides['colors'] = animation as GradientColor[];
      } else if (anim.keyPath === 'backgroundColor') {
        overrides['backgroundColor'] = animation as string;
      } else {
        overrides[anim.keyPath] = animation as number;
      }
    });

    return overrides;
  }, [animations, currentTime, delayMs]);

  return animationOverrides;
}
