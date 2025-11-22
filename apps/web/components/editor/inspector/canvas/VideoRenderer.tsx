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
  const previewSrc = frameAsset?.dataURL;
  if (layer.syncWWithState) return null;
  if (!previewSrc) return null;
  return (
    <img
      src={previewSrc}
      alt={layer.name}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "fill",
        maxWidth: "none",
        maxHeight: "none",
        borderRadius: layer.cornerRadius,
      }}
      draggable={false}
    />
  );
}
