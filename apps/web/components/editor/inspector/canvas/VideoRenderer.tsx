import { VideoLayer } from "@/lib/ca/types";

interface VideoRendererProps {
  layer: VideoLayer;
  assets?: Record<string, { dataURL?: string }>;
}

export default function VideoRenderer({
  layer,
  assets,
}: VideoRendererProps) {
  const frameIndex = layer.currentFrameIndex ?? 0;
  const frameAssetId = `${layer.id}_frame_${frameIndex}`;
  const assetsMap = assets || {};
  const frameAsset = assetsMap[frameAssetId];
  const previewSrc = frameAsset?.dataURL || "";
  return (
    <img
      src={previewSrc}
      alt={layer.name}
      style={{
        width: layer.size.w,
        height: layer.size.h,
        objectFit: "fill",
        maxWidth: "none",
        maxHeight: "none",
      }}
      draggable={false}
    />
  );
}
