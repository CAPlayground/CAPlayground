import { getDisplacementMap } from "./getDisplacementMap";

export type DisplacementOptions = {
  height: number;
  width: number;
  radius: number;
  depth?: number;
  strength?: number;
  chromaticAberration?: number;
};

export const getDisplacementFilter = ({
  height,
  width,
  radius,
  depth,
  strength = 100,
  chromaticAberration = 0,
}: DisplacementOptions) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="displace" color-interpolation-filters="sRGB">
        <feImage
          x="0"
          y="0"
          height="${height}"
          width="${width}"
          href="${getDisplacementMap(
            {
              height,
              width,
              radius,
              depth,
            }
          )}"
          result="displacementMap"
        />
        <feDisplacementMap
          transform-origin="center"
          in="SourceGraphic"
          in2="displacementMap"
          scale="${strength + chromaticAberration * 2}"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
</svg>`) +
"#displace";
