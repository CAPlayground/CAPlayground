import { useTimeline } from "@/context/TimelineContext";
import { VideoLayer } from "@/lib/ca/types";
import useStateTransition from "@/hooks/use-state-transition";

interface VideoRendererProps {
  layer: VideoLayer;
  assets?: Record<string, { dataURL?: string }>;
}

function SyncWithStateRenderer({ 
  video, 
  assets 
}: { 
  video: VideoLayer; 
  assets?: Record<string, { dataURL?: string }>;
}) {
  if (!video.children || video.children.length === 0) return null;
  
  const childrenWithAnimatedZ = video.children.map((child) => {
    const transition = useStateTransition(child);
    return {
      child,
      animatedZPosition: transition.zPosition ?? 0
    };
  });
  
  const topChildData = childrenWithAnimatedZ.sort((a, b) => (b.animatedZPosition ?? 0) - (a.animatedZPosition ?? 0))[0];
  
  const topChild = topChildData.child;
  
  if (!topChild) return null;
  
  if (topChild.type === 'image') {
    const imageAsset = assets?.[topChild.id];
    const imageSrc = imageAsset?.dataURL;
    if (!imageSrc) return null;
    
    return (
      <img
        src={imageSrc}
        alt={topChild.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "fill",
          maxWidth: "none",
          maxHeight: "none",
          borderRadius: video.cornerRadius,
        }}
        draggable={false}
      />
    );
  }
  
  return null;
}

export default function VideoRenderer({
  layer: video,
  assets,
}: VideoRendererProps) {
  const { currentTime } = useTimeline();
  
  if (video.syncWWithState) {
    return <SyncWithStateRenderer video={video} assets={assets} />;
  }
  
  const frameCount = video.frameCount || 0;
  const fps = video.fps || 30;
  const duration = video.duration || (frameCount / fps);
  const autoReverses = video.autoReverses || false;

  if (frameCount <= 1) return;

  let localT = (currentTime / 1000) % duration;
  if (autoReverses) {
    const cycle = duration * 2;
    const m = (currentTime / 1000) % cycle;
    localT = m <= duration ? m : (cycle - m);
  }

  const frameIndex = Math.floor(localT * fps) % frameCount;
  const frameAssetId = `${video.id}_frame_${frameIndex}`;
  const assetsMap = assets || {};
  const frameAsset = assetsMap[frameAssetId];
  const previewSrc = frameAsset?.dataURL;
  if (!previewSrc) return null;
  return (
    <img
      src={previewSrc}
      alt={video.name}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "fill",
        maxWidth: "none",
        maxHeight: "none",
        borderRadius: video.cornerRadius,
      }}
      draggable={false}
    />
  );
}
