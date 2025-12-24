import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeFilename } from "@/lib/editor/file-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useEditor } from "./editor-context";
import { Progress } from "@/components/ui/progress";
import { VideoLayer } from "@/lib/ca/types";

interface VideoLayerDialogProps {
  setVideoLayerIsOpen: (open: boolean) => void;
  open: boolean;
}

const calculateFrameAssetsSize = (assets: Array<{ dataURL: string; filename: string }>): number => {
  let totalBytes = 0;
  for (const asset of assets) {
    const base64Data = asset.dataURL.split(',')[1] || '';
    const padding = (base64Data.match(/=/g) || []).length;
    totalBytes += (base64Data.length * 3) / 4 - padding;
  }
  return totalBytes;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `~${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

export default function VideoLayerDialog({
  setVideoLayerIsOpen,
  open
}: VideoLayerDialogProps) {
  const maxDuration = 12;

  const { addVideoLayer, doc } = useEditor()
  const canvasW = doc?.meta.width || 390;
  const canvasH = doc?.meta.height || 844;
  const videoInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fps, setFps] = useState<string>("30");
  const [isLoading, setIsLoading] = useState(false);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [frameAssets, setFrameAssets] = useState<Array<{ dataURL: string; filename: string }>>([]);
  const [frameAssetsSize, setFrameAssetsSize] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [resizeVideo, setResizeVideo] = useState<boolean>(true);
  const isGif = /image\/gif/i.test(videoFile?.type || '') || /\.gif$/i.test(videoFile?.name || '');
  const frameExtension = isGif ? '.png' : '.jpg';
  const rawName = videoFile?.name && typeof videoFile.name === 'string' ? videoFile.name : 'Video Layer';
  const nameSansExt = rawName.replace(/\.[a-z0-9]+$/i, '');
  const safeName = sanitizeFilename(nameSansExt) || 'Video_Layer';
  const framePrefix = `${safeName}_`;

  useEffect(() => {
    if (!open) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
    setVideoFile(null);
    setFps("30");
    setIsLoading(false);
    setFrameCount(0);
    setCurrentFrame(0);
    setFrameAssets([]);
    setFrameAssetsSize(0);
    setWidth(0);
    setHeight(0);
    setDuration(0);
    setResizeVideo(true);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
    if (open) {
      const timer = setTimeout(() => {
        videoInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isGif) {
      setFps("15");
    } else {
      setFps("30");
    }
  }, [isGif])

  useEffect(() => {
    if (!videoFile) {
      setFrameAssets([]);
      setFrameAssetsSize(0);
      return;
    }

    const extractFrames = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsLoading(true);
      try {
        const newFrameAssets = isGif
          ? await getGifFramesAssets(videoFile, signal)
          : await getFrameAssets(videoFile, Number(fps), signal);
        if (!signal.aborted) {
          setFrameAssets(newFrameAssets);
          const totalSize = calculateFrameAssetsSize(newFrameAssets);
          setFrameAssetsSize(totalSize);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Error extracting frames:', e);
        }
        if (!signal.aborted) {
          setFrameAssets([]);
          setFrameAssetsSize(0);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    extractFrames();
  }, [videoFile, fps, resizeVideo]);

  const getGifFramesAssets = async (file: File, signal: AbortSignal): Promise<Array<{ dataURL: string; filename: string }>> => {
    const newFrameAssets: Array<{ dataURL: string; filename: string }> = [];

    if (!window.ImageDecoder) {
      throw new Error('Importing GIFs as video requires a browser with ImageDecoder (WebCodecs) support.');
    }
    const buf = await file.arrayBuffer();
    const decoder: any = new window.ImageDecoder({ data: new Uint8Array(buf), type: 'image/gif' });
    let track: any = null;
    try { track = decoder.tracks?.selectedTrack || decoder.tracks?.[0] || null; } catch { }
    let gifFrameCount: number = Number(track?.frameCount ?? 0);
    if (!Number.isFinite(gifFrameCount) || gifFrameCount <= 0) {
      gifFrameCount = 0;
      for (let i = 0; i < 300; i++) {
        try { await decoder.decode({ frameIndex: i }); gifFrameCount++; } catch { break; }
      }
    }
    const first = await decoder.decode({ frameIndex: 0 });
    const firstImage: any = first.image;
    const width = Number(firstImage?.displayWidth ?? firstImage?.codedWidth ?? firstImage?.width ?? 0);
    const height = Number(firstImage?.displayHeight ?? firstImage?.codedHeight ?? firstImage?.height ?? 0);
    setWidth(width);
    setHeight(height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    const assumedFps = 15;
    const maxFrames = Math.min(gifFrameCount || 300, Math.floor(maxDuration * assumedFps));
    setFrameCount(maxFrames);
    setCurrentFrame(0);
    for (let i = 0; i < maxFrames; i++) {
      if (signal.aborted) {
        break;
      }
      try {
        const res = await decoder.decode({ frameIndex: i });
        const img: any = res.image;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');
        const filename = `${framePrefix}${i}${frameExtension}`;
        newFrameAssets.push({ dataURL, filename });
        try { img.close?.(); } catch { }
        setCurrentFrame(i + 1);
      } catch { break; }
    }
    const fps = assumedFps;
    const frameCount = newFrameAssets.length;
    const duration = frameCount > 0 ? (frameCount / fps) : 0;
    setDuration(duration);
    return newFrameAssets;
  };

  const getFrameAssets = async (file: File, fps: number, signal: AbortSignal): Promise<Array<{ dataURL: string; filename: string }>> => {
    const newFrameAssets: Array<{ dataURL: string; filename: string }> = [];

    const video = document.createElement('video');
    video.preload = 'metadata';
    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        // Wait a bit to ensure dimensions are available
        setTimeout(() => resolve(), 50);
      };
      video.onerror = reject;
    });
    const newDuration = Math.min(video.duration, maxDuration);
    setDuration(newDuration);

    const frameCount = Math.floor(newDuration * fps);
    const canvas = document.createElement('canvas');
    const videoWidth = video.videoWidth || 0;
    const videoHeight = video.videoHeight || 0;

    if (videoWidth === 0 || videoHeight === 0) {
      URL.revokeObjectURL(videoURL);
      throw new Error('Failed to get video dimensions');
    }

    if (resizeVideo) {
      if (videoWidth > canvasW || videoHeight > canvasH) {
        const scaleW = canvasW / videoWidth;
        const scaleH = canvasH / videoHeight;
        const scale = Math.min(scaleW, scaleH);
        canvas.width = videoWidth * scale;
        canvas.height = videoHeight * scale;
      }
    } else {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    setWidth(canvas.width);
    setHeight(canvas.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(videoURL);
      throw new Error('Failed to get canvas context');
    }
    setFrameCount(frameCount);
    setCurrentFrame(0);
    for (let i = 0; i < frameCount; i++) {
      if (signal.aborted) {
        break;
      }
      const time = (i / fps);
      video.currentTime = time;

      await new Promise<void>((resolve) => {
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL('image/jpeg', 0.7);
          const filename = `${framePrefix}${i}${frameExtension}`;
          newFrameAssets.push({ dataURL, filename });
          resolve();
        };
      });
      setCurrentFrame(i + 1);
    }

    video.src = '';
    URL.revokeObjectURL(videoURL);
    return newFrameAssets;
  };

  const handleCreateVideoLayer = async () => {
    if (videoFile) {
      const newVideoLayer: Partial<VideoLayer> = {
        name: videoFile.name,
        frameCount: frameAssets.length,
        fps: Number(fps),
        duration,
        framePrefix,
        frameExtension,
      };
      addVideoLayer(newVideoLayer, width, height, frameAssets);
      setVideoLayerIsOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setVideoLayerIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Video Layer</DialogTitle>
          <DialogDescription>
            Upload a video or GIF to create a video layer. The video will be converted to individual frames.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="video/*,image/gif"
            ref={videoInputRef}
            onChange={handleVideoFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => videoInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {videoFile ? videoFile.name : "Choose video or GIF"}
          </Button>
          <Select value={isGif ? "15" : fps} disabled={isGif} onValueChange={(value) => setFps(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select frames per second" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 fps</SelectItem>
              <SelectItem value="30">30 fps</SelectItem>
              <SelectItem value="60">60 fps</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {videoFile && !isGif &&
          <div className="flex items-center gap-2">
            <Checkbox id="resize-video" checked={resizeVideo} onCheckedChange={(checked: boolean) => setResizeVideo(checked)} />
            <Label htmlFor="resize-video">Resize to fit canvas</Label>
          </div>
        }
        <Label>Dimensions: {width}x{height}px</Label>
        <Label>Duration: {duration.toFixed(2)}s </Label>
        <div className="space-y-2">
          <Label>
            Layer Size: {isLoading ? `Generating frames... (${currentFrame}/${frameCount})` : frameAssetsSize > 0 ? formatBytes(frameAssetsSize) : '0 Bytes'}
          </Label>
          {!isLoading && frameAssetsSize > 30 * 1024 * 1024 && (
            <Alert variant="destructive">
              <AlertDescription>
                Warning: Layer size exceeds 30MB. This may impact performance and memory usage.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <Progress value={frameCount > 0 ? (currentFrame / frameCount) * 100 : 0} max={100} />
        <Alert>
          <AlertDescription>
            {isGif
              ? "For GIFs, the frame rate is automatically set to 15 fps for optimal performance."
              : "Note: 30 fps is recommended for optimal performance. Higher frame rates (60 fps) are better for videos synced with state transitions but will increase file size."
            }
          </AlertDescription>
        </Alert>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setVideoLayerIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateVideoLayer} disabled={!videoFile || isLoading}>
            Create Video Layer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}