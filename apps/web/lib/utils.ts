import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function hexToForegroundColor(value?: string): string | undefined {
  if (!value) return undefined;
  const m = value.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return undefined;
  const hex = m[1].length === 6 ? m[1] : m[1].slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const toUnit = (n: number) => (n / 255);
  const fmt = (n: number) => {
    const s = (Math.round(n * 10000) / 10000).toString();
    return s;
  };
  return `${fmt(toUnit(r))} ${fmt(toUnit(g))} ${fmt(toUnit(b))}`;
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}