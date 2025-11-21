import { ImageLayer } from "@/lib/ca/types";

interface ImageRendererProps {
  layer: ImageLayer;
  assets?: Record<string, { dataURL?: string }>;
}

export default function ImageRenderer({
  layer,
  assets,
}: ImageRendererProps) {
  const assetsMap = assets || {};
  const imgAsset = assetsMap[layer.id];
  const previewSrc = imgAsset?.dataURL || layer.src;
  if (!previewSrc) return null;
  return (
    <img
      src={previewSrc}
      alt={layer.name}
      style={{
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
        transform: 'none',
        objectFit: "fill",
        maxWidth: "none",
        maxHeight: "none",
      }}
      draggable={false}
    />
  );
}
