import { useAssetUrl } from "@/hooks/use-asset-url";

interface EmitterCellThumbnailProps {
  cellId: string;
  cellSrc?: string;
  size?: number;
  className?: string;
}

export default function EmitterCellThumbnail({
  cellId,
  cellSrc,
  size = 20,
  className = "object-contain",
}: EmitterCellThumbnailProps) {
  const { src, loading } = useAssetUrl({
    cacheKey: cellId,
    assetSrc: cellSrc,
    skip: !cellSrc,
  });

  if (loading || !src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-muted rounded animate-pulse"
      />
    );
  }

  return (
    <img
      src={src}
      alt="Cell"
      width={size}
      height={size}
      className={className}
    />
  );
}

