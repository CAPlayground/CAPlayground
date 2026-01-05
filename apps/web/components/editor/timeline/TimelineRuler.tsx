import { useTimeline } from "@/context/TimelineContext";
import { clamp } from "@/lib/utils";
import { Button } from "../../ui/button";
import { Minus, Plus } from "lucide-react";
import { useState, useRef, useLayoutEffect, useEffect } from "react";

export default function TimelineRuler() {
  const { currentTime: time, setTime } = useTimeline();
  const currentTime = time / 1000;
  const duration = 600;
  const initialViewSeconds = 10;
  const [viewSeconds, setViewSeconds] = useState(
    clamp(initialViewSeconds, 1, duration)
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const [viewportW, setViewportW] = useState(1);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth || 1));
    ro.observe(el);
    setViewportW(el.clientWidth || 1);
    return () => ro.disconnect();
  }, []);

  const pxPerSecond = viewportW / viewSeconds;
  const totalWidthPx = duration * pxPerSecond;

  const getTickIntervals = (viewSecs: number) => {
    const targetLabels = 5;
    const rawInterval = viewSecs / targetLabels;

    const niceIntervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    let labelEvery = niceIntervals[niceIntervals.length - 1];
    for (const interval of niceIntervals) {
      if (rawInterval <= interval) {
        labelEvery = interval;
        break;
      }
    }

    const tickEvery = labelEvery / 5;
    return { tickEvery, labelEvery };
  };

  const { tickEvery, labelEvery } = getTickIntervals(viewSeconds);

  const zoomIn = () => setViewSeconds((s) => clamp(s * 2, 1, duration));
  const zoomOut = () => setViewSeconds((s) => clamp(s / 2, 1, duration));

  const onTimeChange = (t: number) => {
    setTime(t * 1000);
  };

  const clientXToTime = (clientX: number) => {
    const ruler = rulerRef.current;
    if (!ruler) return currentTime;
    const rect = ruler.getBoundingClientRect();
    const x = clientX - rect.left;
    return clamp(x / pxPerSecond, 0, duration);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    onTimeChange(clientXToTime(e.clientX));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    onTimeChange(clientXToTime(e.clientX));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }
  };

  useEffect(() => {
    if (draggingRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const x = currentTime * pxPerSecond;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;
    const margin = 40;
    if (x < left + margin) el.scrollLeft = Math.max(0, x - margin);
    else if (x > right - margin)
      el.scrollLeft = Math.min(totalWidthPx - el.clientWidth, x - el.clientWidth + margin);
  }, [currentTime, pxPerSecond, totalWidthPx]);

  const playheadX = currentTime * pxPerSecond;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-14 max-w-[calc(100%-110px)] w-[500px] p-1 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 shadow-sm">
      <div className="flex items-center justify-between p-1">
        <div className="text-sm font-semibold">Timeline</div>

        <div className="flex items-center gap-2">
          <Button
            onClick={zoomOut}
            className="h-6 w-6 bg-white/80 dark:bg-gray-900/70 hover:dark:bg-slate-700"
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            disabled={viewSeconds === 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs">Scale</span>
          <Button
            onClick={zoomIn}
            className="h-6 w-6 bg-white/80 dark:bg-gray-900/70 hover:dark:bg-slate-700"
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            disabled={viewSeconds === 600}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="rounded border border-gray-200 dark:border-gray-700 relative overflow-x-auto overflow-y-hidden bg-white/80 dark:bg-gray-900/70 scrollbar-thin"
      >
        <div
          ref={rulerRef}
          className="relative h-8 cursor-col-resize"
          style={{ width: totalWidthPx }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {Array.from({ length: Math.floor(duration / tickEvery) + 1 }).map((_, i) => {
            const t = +(i * tickEvery).toFixed(3);
            const x = t * pxPerSecond;
            const isLabeled = Math.abs(t % labelEvery) < 0.001 || Math.abs(t % labelEvery - labelEvery) < 0.001;

            const formatLabel = (seconds: number) => {
              if (seconds === Math.floor(seconds)) return `${seconds}s`;
              return `${seconds.toFixed(1)}s`;
            };

            return (
              <div key={t} className="absolute bottom-0" style={{ left: x }}>
                <div className={isLabeled ? "h-8 w-px bg-slate-600" : "h-4 w-px bg-slate-500/80"} />
                {isLabeled && (
                  <div className="absolute top-0 left-1 text-[11px] whitespace-nowrap">
                    {formatLabel(t)}
                  </div>
                )}
              </div>
            );
          })}

          <div className="absolute top-0 bottom-0 w-[2px] bg-accent" style={{ left: playheadX }} />

          <div className="pointer-events-none absolute top-0 bottom-0 left-0 bg-accent/30" style={{ width: playheadX }} />
        </div>
      </div>
    </div>
  );
}
