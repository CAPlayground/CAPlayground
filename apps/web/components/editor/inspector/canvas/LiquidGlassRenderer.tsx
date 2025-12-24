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

  // 在 LiquidGlassRenderer.tsx 中修改 style 的定义
  let style: CSSProperties = useMemo(() => ({
    height: `${height}px`,
    width: `${width}px`,
    borderRadius: `${radius}px`,
    WebkitBackdropFilter: `url('${filter}')`, // 添加这一行
    backdropFilter: `url('${filter}')`,
    background: debug ? `url("${map}")` : "none",
    boxShadow: "none",
    transform: 'translateZ(0)', // 强制开启 GPU 合成层
  }), [filter, map, height, width, radius, debug]);

  return (
    <div style={style}>
      {children}
    </div>
  );
};
