import { ImageLayer } from "@/lib/ca/types";
import { useAssetUrl } from "@/hooks/use-asset-url";

interface ImageRendererProps {
  layer: ImageLayer;
}

export default function ImageRenderer({
  layer,
}: ImageRendererProps) {
  const { src, loading } = useAssetUrl({
    cacheKey: layer.id,
    assetSrc: layer.src,
  });

  if (loading || !src) return null;
  return (
    <img
      src={src}
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
        borderRadius: layer.cornerRadius,
      }}
      draggable={false}
    />
  );
}
