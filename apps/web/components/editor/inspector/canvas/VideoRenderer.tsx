import { useTimeline } from "@/context/TimelineContext";
import { VideoLayer } from "@/lib/ca/types";
import useStateTransition from "@/hooks/use-state-transition";
import { assetCache, useVideoFrames } from "@/hooks/use-asset-url";

interface VideoRendererProps {
  layer: VideoLayer;
}

function SyncWithStateRenderer({ 
  video, 
}: { 
  video: VideoLayer; 
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
    const frameIndex = video.children.findIndex((child) => child.id === topChild.id);
    const frameAssetId = `${video.id}_frame_${frameIndex}`;
    const imageSrc = assetCache.get(frameAssetId);
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
}: VideoRendererProps) {
  const { currentTime } = useTimeline();
  const frameCount = video.frameCount || 0;
  const fps = video.fps || 30;
  const duration = video.duration || (frameCount / fps);
  const autoReverses = video.autoReverses || false;

  const { frames, loading } = useVideoFrames({
    videoId: video.id,
    frameCount,
    framePrefix: video.framePrefix || "",
    frameExtension: video.frameExtension || "",
    skip: frameCount <= 1,
  });

  if (frameCount <= 1) return null;
  
  if (video.syncWWithState) {
    return <SyncWithStateRenderer video={video} />;
  }

  let localT = (currentTime / 1000) % duration;
  if (autoReverses) {
    const cycle = duration * 2;
    const m = (currentTime / 1000) % cycle;
    localT = m <= duration ? m : (cycle - m);
  }

  const frameIndex = Math.floor(localT * fps) % frameCount;
  const src = frames.get(frameIndex);
  
  if (loading || !src) return null;
  return (
    <img
      src={src}
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
