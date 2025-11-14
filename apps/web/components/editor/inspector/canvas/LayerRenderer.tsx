import { MouseEvent as ReactMouseEvent } from 'react';
import { AnyLayer, EmitterLayer, ShapeLayer, TransformLayer } from '@/lib/ca/types';
import { LayerContextMenu } from '../../layer-context-menu';
import { EmitterCanvas } from '../../emitter/EmitterCanvas';
import { blendModes } from '@/lib/blending';
import { useEditor } from '../../editor-context';
import GradientRenderer from './GradientRenderer';
import TextRenderer from './TextRenderer';
import ImageRenderer from './ImageRenderer';
import VideoRenderer from './VideoRenderer';
import { useTransform } from './TransformRenderer';
import ReplicatorRenderer from './ReplicatorRenderer';
import { computeCssLT, getAnchor } from '../../canvas-preview/utils/coordinates';

interface LayerRendererProps {
  layer: AnyLayer;
  containerH: number;
  useYUp: boolean;
  siblings: AnyLayer[];
  assets?: Record<string, { dataURL?: string }>;
  disableHitTesting?: boolean;
  hiddenLayerIds: Set<string>;
  timeSec: number;
  gyroX: number;
  gyroY: number;
  useGyroControls: boolean;
  onStartDrag: (l: AnyLayer, e: ReactMouseEvent, containerH: number, useYUp: boolean) => void;
  onEvalLayerAnimation: (l: AnyLayer, t: number) => void;
}

const hexToRgba = (hex?: string, alpha?: number): string | undefined => {
  if (!hex) return undefined;
  const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return hex;
  const h = m[1].length === 6 ? m[1] : m[1].slice(0, 6);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = (typeof alpha === 'number') ? Math.max(0, Math.min(1, alpha)) : 1;
  if (a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const bgStyleFor = (layer: AnyLayer): React.CSSProperties => {
  const hex = layer.backgroundColor as string | undefined;
  const a = layer.backgroundOpacity as number | undefined;
  const css = hexToRgba(hex, a);
  return css ? { background: css } : {};
};
const touchToMouseLike = (t: any) => ({
  clientX: t.clientX,
  clientY: t.clientY,
  button: 0,
  shiftKey: false,
  preventDefault: () => {},
  stopPropagation: () => {},
} as any);

export function LayerRenderer({
  layer,
  containerH,
  useYUp,
  siblings,
  assets,
  disableHitTesting = false,
  hiddenLayerIds,
  timeSec,
  gyroX,
  gyroY,
  useGyroControls,
  onStartDrag,
  onEvalLayerAnimation,
}: LayerRendererProps) {
  const anchor = getAnchor(layer);
  const { left, top } = computeCssLT(layer, containerH, useYUp);
  const transformOriginY = useYUp ? (1 - anchor.y) * 100 : anchor.y * 100;
  const isWrappedContent = (layer as any).__wrappedContent === true || disableHitTesting === true;

  const startDrag = (layer: AnyLayer, e: ReactMouseEvent) => {
    onStartDrag(layer, e, containerH, useYUp);
  };

  const renderChildren = (layer: AnyLayer, nextUseYUp: boolean) => {
    return layer.children?.map((c) => {
      return (
        <LayerRenderer
          key={c.id}
          layer={c}
          containerH={layer.size.h}
          useYUp={nextUseYUp}
          siblings={layer.children || []}
          assets={assets}
          hiddenLayerIds={hiddenLayerIds}
          timeSec={timeSec}
          gyroX={gyroX}
          gyroY={gyroY}
          useGyroControls={useGyroControls}
          onStartDrag={onStartDrag}
          onEvalLayerAnimation={onEvalLayerAnimation}
        />
      );
    });
  };

  const borderStyle: React.CSSProperties = (typeof layer.borderWidth === 'number' && layer.borderWidth > 0)
    ? { border: `${layer.borderWidth}px solid ${layer.borderColor || '#000000'}` }
    : {};

  const common: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    width: layer.size.w,
    height: layer.size.h,
    transform: `rotateX(${-(layer.rotationX ?? 0)}deg) rotateY(${-(layer.rotationY ?? 0)}deg) rotate(${-(layer.rotation ?? 0)}deg) translateZ(${layer.zPosition ?? 0}px)`,
    transformOrigin: `${anchor.x * 100}% ${transformOriginY}%`,
    backfaceVisibility: "visible",
    display: (layer.visible === false || hiddenLayerIds.has(layer.id)) ? "none" : undefined,
    opacity: typeof layer.opacity === 'number' ? Math.max(0, Math.min(1, layer.opacity)) : undefined,
    cursor: "move",
    pointerEvents: isWrappedContent ? 'none' : undefined,
    ...borderStyle,
    ...(typeof layer.cornerRadius === 'number' ? { borderRadius: layer.cornerRadius } : {}),
    overflow: layer.masksToBounds ? 'hidden' : 'visible',
    mixBlendMode: blendModes[layer.blendMode || 'normalBlendMode']?.css ?? 'normal',
    transformStyle: 'preserve-3d',
  };

  if (layer.filters) {
    let filterString = '';
    const currentFilters = layer.filters.filter(f => f.enabled);
    for (const filter of currentFilters) {
      if (filter.type === 'gaussianBlur') {
        filterString += `blur(${filter.value}px) `;
      }
      if (filter.type === 'colorContrast') {
        filterString += `contrast(${filter.value}) `;
      }
      if (filter.type === 'colorHueRotate') {
        filterString += `hue-rotate(${filter.value}deg) `;
      }
      if (filter.type === 'colorInvert') {
        filterString += 'invert(100%) ';
      }
      if (filter.type === 'colorSaturate') {
        filterString += `saturate(${filter.value}) `;
      }
      if (filter.type === 'CISepiaTone') {
        filterString += `sepia(${filter.value}) `;
      }
    }
    common.filter = filterString.trim();
  }

  const nextUseYUp = (typeof layer.geometryFlipped === 'number')
    ? ((layer.geometryFlipped as 0 | 1) === 0)
    : useYUp;

  const transformString = useTransform({
    layer: layer as TransformLayer,
    useGyroControls,
    gyroX,
    gyroY,
  });
  let style: React.CSSProperties = {
    ...common,
    ...bgStyleFor(layer),
  };
  if (layer.type === "shape") {
    const s = layer as ShapeLayer;
    const corner = layer.cornerRadius as number | undefined;
    const legacy = s.radius;
    const borderRadius = s.shape === "circle" ? 9999 : ((corner ?? legacy ?? 0));
    style = layer.backgroundColor
      ? { ...style, borderRadius }
      : { ...style, background: s.fill, borderRadius };
  }
  if (layer.type === "transform") {
    style = {
      ...style,
      transform: transformString,
      transformStyle: 'preserve-3d',
    };
  }

  return (
    <LayerContextMenu layer={layer} siblings={siblings}>
      <div
        style={style}
        onMouseDown={isWrappedContent ? undefined : (e) => startDrag(layer, e)}
        onTouchStart={isWrappedContent ? undefined : ((e) => {
          if (e.touches.length === 1) {
            e.preventDefault();
            startDrag(layer, touchToMouseLike(e.touches[0]));
          }
        })}
      >
        {layer.type === "text" && (
          <TextRenderer layer={layer} />
        )}
        {layer.type === "image" && (
          <ImageRenderer layer={layer} assets={assets} />
        )}
        {layer.type === "video" && (
          <VideoRenderer layer={layer} assets={assets} />
        )}
        {layer.type === "gradient" && (
          <GradientRenderer layer={layer} />
        )}
        {layer.type === "emitter" && (
          <EmitterCanvas layer={layer} assets={assets} />
        )}
        {layer.type !== "replicator" && renderChildren(layer, nextUseYUp)}
        {layer.type === "replicator" && (
          <ReplicatorRenderer
            layer={layer}
            timeSec={timeSec}
            gyroX={gyroX}
            gyroY={gyroY}
            nextUseYUp={nextUseYUp}
            assets={assets}
            hiddenLayerIds={hiddenLayerIds}
            useGyroControls={useGyroControls}
            onStartDrag={onStartDrag}
            onEvalLayerAnimation={onEvalLayerAnimation}
            transformOriginY={transformOriginY}
            anchor={anchor}
          />
        )}
      </div>
    </LayerContextMenu>
  )
}
