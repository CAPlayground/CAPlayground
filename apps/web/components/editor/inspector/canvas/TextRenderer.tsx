import { TextLayer } from "@/lib/ca/types";

interface TextRendererProps {
  layer: TextLayer;
}

export default function TextRenderer({
  layer,
}: TextRendererProps) {
  const cssAlign = (layer.align === 'justified')
    ? 'justify'
    : (layer.align || 'left');
  const whiteSpace: React.CSSProperties['whiteSpace'] = (layer.wrapped ?? 1) === 1
    ? 'normal'
    : 'nowrap';
  return (
    <div style={{
      fontFamily: layer.fontFamily,
      color: layer.color,
      fontSize: layer.fontSize,
      textAlign: cssAlign as any,
      whiteSpace
    }}>
      {layer.text}
    </div>
  );
}
