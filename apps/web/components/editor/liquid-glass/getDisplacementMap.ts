import { clamp } from "@/lib/utils";
import { DisplacementOptions } from "./getDisplacementFilter";

const gap = 40
const depth = 12
export const getDisplacementMap = ({
  height,
  width,
  radius = 0,
}: Omit<DisplacementOptions, "chromaticAberration" | "strength">) => {
  const gapY1 = gap / height * 100
  const minGapY1 = clamp(radius / height * 100, gapY1, 50)
  const gapY2 = (height - gap) / height * 100
  const minGapY2 = clamp((height - radius) / height * 100, 50, gapY2)
  const gapX1 = gap / width * 100
  const minGapX1 = clamp(radius / width * 100, gapX1, 50)
  const gapX2 = (width - gap) / width * 100
  const minGapX2 = clamp((width - radius) / width * 100, 50, gapX2)
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .mix { mix-blend-mode: screen; }
      </style>
      <defs>
        <linearGradient 
          id="Y" 
          x1="0" 
          x2="0" 
          y1="0" 
          y2="100%"
        >
          <stop offset="0%" stop-color="#0F0" />
          <stop offset="${minGapY1}%" stop-color="#008a00" />
          <stop offset="${minGapY2}%" stop-color="#008a00" />
          <stop offset="100%" stop-color="#000" />
        </linearGradient>
        <linearGradient 
          id="X" 
          x1="0" 
          x2="100%"
          y1="0" 
          y2="0">
          <stop offset="0%" stop-color="#F00" />  
          <stop offset="${minGapX1}%" stop-color="#8a0000" />
          <stop offset="${minGapX2}%" stop-color="#8a0000" />
          <stop offset="100%" stop-color="#000" />
        </linearGradient>
      </defs>
  
      <rect x="0" y="0" height="${height}" width="${width}" fill="#8a8a8a" />
      <g filter="blur(2px)">
        <rect x="0" y="0" height="${height}" width="${width}" fill="#00008a" />
        <rect
          x="0"
          y="0"
          height="${height}"
          width="${width}"
          fill="url(#Y)"
          class="mix"
        />
        <rect
          x="0"
          y="0"
          height="${height}"
          width="${width}"
          fill="url(#X)"
          class="mix"
        />
        <rect
          x="${depth}"
          y="${depth}"
          height="${height - (2 * depth)}"
          width="${width - (2 * depth)}"
          fill="#8a8a8a"
          rx="${radius}"
          ry="${radius}"
          filter="blur(${depth}px)"
        />
      </g>
    </svg>`
  ))
}
      