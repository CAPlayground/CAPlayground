import { AnyLayer, ShapeLayer, TransformLayer } from '@/lib/ca/types';
import { LayerContextMenu } from '../../layer-context-menu';
import { EmitterCanvas } from '../../emitter/EmitterCanvas';
import { blendModes } from '@/lib/blending';
import GradientRenderer from './GradientRenderer';
import TextRenderer from './TextRenderer';
import ImageRenderer from './ImageRenderer';
import VideoRenderer from './VideoRenderer';
import { useTransform } from './TransformRenderer';
import ReplicatorRenderer from './ReplicatorRenderer';
import { getAnchor } from '../../canvas-preview/utils/coordinates';
import Moveable from 'react-moveable';
import { useMoveablePointerDrag } from '../../hooks/use-moveable-pointer-drag';

interface LayerRendererProps {
  layer: AnyLayer;
  useYUp: boolean;
  siblings: AnyLayer[];
  assets?: Record<string, { dataURL?: string }>;
  disableHitTesting?: boolean;
  hiddenLayerIds: Set<string>;
  timeSec: number;
  gyroX: number;
  gyroY: number;
  useGyroControls: boolean;
  onEvalLayerAnimation: (l: AnyLayer, t: number) => void;
  moveableRef?: React.RefObject<Moveable | null>;
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

export function LayerRenderer({
  layer,
  useYUp,
  siblings,
  assets,
  disableHitTesting = false,
  hiddenLayerIds,
  timeSec,
  gyroX,
  gyroY,
  useGyroControls,
  onEvalLayerAnimation,
  moveableRef
}: LayerRendererProps) {
  const anchor = getAnchor(layer);
  const transformOriginY = useYUp ? (1 - anchor.y) * 100 : anchor.y * 100;
  const isWrappedContent = (layer as any).__wrappedContent === true || disableHitTesting === true;

  const renderChildren = (layer: AnyLayer, nextUseYUp: boolean) => {
    if (layer.type === 'video' && layer.children?.length) {
      const imageToRender = layer.children.sort((a, b) => (b.zPosition ?? 0) - (a.zPosition ?? 0))[0];
      return <LayerRenderer
        layer={imageToRender}
        useYUp={nextUseYUp}
        siblings={layer.children}
        assets={assets}
        hiddenLayerIds={hiddenLayerIds}
        timeSec={timeSec}
        gyroX={gyroX}
        gyroY={gyroY}
        useGyroControls={useGyroControls}
        onEvalLayerAnimation={onEvalLayerAnimation}
        disableHitTesting
      />
    };
    return layer.children?.map((c) => {
      return (
        <LayerRenderer
          key={c.id}
          layer={c}
          useYUp={nextUseYUp}
          siblings={layer.children || []}
          assets={assets}
          hiddenLayerIds={hiddenLayerIds}
          timeSec={timeSec}
          gyroX={gyroX}
          gyroY={gyroY}
          useGyroControls={useGyroControls}
          onEvalLayerAnimation={onEvalLayerAnimation}
          moveableRef={moveableRef}
        />
      );
    });
  };

  const borderStyle: React.CSSProperties = (typeof layer.borderWidth === 'number' && layer.borderWidth > 0)
    ? { border: `${layer.borderWidth}px solid ${layer.borderColor || '#000000'}` }
    : {};

  const translateX = layer.position.x - (layer.anchorPoint?.x ?? 0.5 * layer.size.w);
  const translateY = (useYUp ? -layer.position.y : layer.position.y) - (layer.anchorPoint?.y ?? 0.5 * layer.size.h);
  const common: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: useYUp ? '100%' : 0,
    width: layer.size.w,
    height: layer.size.h,
    transform: `translateX(${translateX}px) translateY(${translateY}px) rotateX(${-(layer.rotationX ?? 0)}deg) rotateY(${-(layer.rotationY ?? 0)}deg) rotate(${-(layer.rotation ?? 0)}deg)`,
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
      transform: [style.transform, transformString].filter(Boolean).join(' '),
      transformStyle: 'preserve-3d',
    };
  }
  const { onPointerDown, onPointerMove, onPointerUp } = useMoveablePointerDrag({
    layerId: layer.id,
    moveableRef,
  });

  return (
    <LayerContextMenu layer={layer} siblings={siblings}>
      <div
        id={layer.id}
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        data-y-up={useYUp}
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
            onEvalLayerAnimation={onEvalLayerAnimation}
            transformOriginY={transformOriginY}
            anchor={anchor}
          />
        )}
      </div>
    </LayerContextMenu>
  )
}
