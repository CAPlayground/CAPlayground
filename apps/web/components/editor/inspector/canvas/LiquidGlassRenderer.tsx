import { CSSProperties, ReactNode, useMemo } from "react";
import {
  getDisplacementFilter,
  DisplacementOptions,
} from "../../liquid-glass/getDisplacementFilter";
import { getDisplacementMap } from "../../liquid-glass/getDisplacementMap";

type LiquidGlassRendererProps = DisplacementOptions & {
  children?: ReactNode | undefined;
  debug?: boolean;
};

export default function LiquidGlassRenderer({
  height,
  width,
  depth = 8,
  radius,
  children,
  strength = 125,
  chromaticAberration = 0,
  debug = false,
}: LiquidGlassRendererProps) {

  const filter = useMemo(() => getDisplacementFilter({
    height,
    width,
    radius,
    depth,
    strength,
    chromaticAberration,
  }), [height, width, radius, depth, strength, chromaticAberration]);
  const map = useMemo(() => getDisplacementMap({
    height,
    width,
    radius,
    depth,
  }), [height, width, radius, depth]);

  let style: CSSProperties = useMemo(() => ({
    height: `${height}px`,
    width: `${width}px`,
    borderRadius: `${radius}px`,
    backdropFilter: `url('${filter}')`,
    background: debug ? `url("${map}")` : "none",
    boxShadow: "none",
  }), [filter, map]);

  return (
    <div style={style}>
      {children}
    </div>
  );
};
