import { useTimeline } from "@/context/TimelineContext";
import { clamp } from "@/lib/utils";
import { Button } from "../../ui/button";
import { Minus, Plus } from "lucide-react";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useEditor } from "@/components/editor/editor-context";
import { TimelineLayerRow } from "./TimelineLayerRow";

const MIN_LABEL_WIDTH = 100;
const MAX_LABEL_WIDTH = 200;

export default function Timeline() {
  const { currentTime: time, setTime } = useTimeline();
  const { doc, selectLayer } = useEditor();
  const currentKey = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[currentKey];
  const layers = current?.layers ?? [];
  const selectedId = current?.selectedId ?? null;
  const currentTime = time / 1000;
  const duration = 600;
  const initialViewSeconds = 10;
  const [viewSeconds, setViewSeconds] = useState(
    clamp(initialViewSeconds, 1, duration)
  );
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [labelWidth, setLabelWidth] = useState(MIN_LABEL_WIDTH);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(labelWidth);

  const [viewportW, setViewportW] = useState(1);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportW(Math.max(1, el.clientWidth - labelWidth)));
    ro.observe(el);
    setViewportW(Math.max(1, el.clientWidth - labelWidth));
    return () => ro.disconnect();
  }, [labelWidth]);

  const pxPerSecond = viewportW / viewSeconds;
  const trackWidth = duration * pxPerSecond;
  const totalWidth = labelWidth + trackWidth;

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
    e.preventDefault();
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

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizingRef.current = true;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = labelWidth;
  };

  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    const deltaX = e.clientX - resizeStartXRef.current;
    const newWidth = clamp(resizeStartWidthRef.current + deltaX, MIN_LABEL_WIDTH, MAX_LABEL_WIDTH);
    setLabelWidth(newWidth);
  };

  const onResizePointerUp = (e: React.PointerEvent) => {
    resizingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }
  };

  useEffect(() => {
    if (draggingRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const x = labelWidth + currentTime * pxPerSecond;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;
    const margin = 60;
    if (x < left + margin) el.scrollLeft = Math.max(0, x - margin);
    else if (x > right - margin)
      el.scrollLeft = Math.min(totalWidth - el.clientWidth, x - el.clientWidth + margin);
  }, [currentTime, pxPerSecond, totalWidth, labelWidth]);

  const playheadX = labelWidth + currentTime * pxPerSecond;

  const formatLabel = (seconds: number) => {
    if (seconds === Math.floor(seconds)) return `${seconds}s`;
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-14 w-[100%] p-1 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 shadow-sm">
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

      <div className="relative">
        <div
          className="absolute top-0 bottom-0 w-2 cursor-col-resize z-40 touch-none group"
          style={{ left: labelWidth - 4 }}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        >
          <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 dark:bg-gray-600 group-hover:bg-accent group-active:bg-accent transition-colors" />
        </div>
        <div
          ref={scrollerRef}
          className="overflow-auto max-h-48 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 scrollbar-thin"
        >
          <div className="relative" style={{ width: totalWidth }}>
            <div className="sticky top-0 z-20 flex h-6">
              <div
                className="sticky left-0 z-30 shrink-0 flex items-center px-1 border-r border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                style={{ width: labelWidth }}
              >
                <span className="text-[10px] text-gray-500">Time</span>
              </div>
              <div
                ref={rulerRef}
                className="relative border-b border-gray-200 dark:border-gray-700 cursor-col-resize touch-none bg-white dark:bg-gray-900"
                style={{ width: trackWidth }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {Array.from({ length: Math.floor(duration / tickEvery) + 1 }).map((_, i) => {
                  const t = +(i * tickEvery).toFixed(3);
                  const x = t * pxPerSecond;
                  const isLabeled =
                    Math.abs(t % labelEvery) < 0.001 || Math.abs((t % labelEvery) - labelEvery) < 0.001;

                  return (
                    <div key={t} className="absolute bottom-0" style={{ left: x }}>
                      <div className={isLabeled ? 'h-6 w-px bg-slate-600' : 'h-3 w-px bg-slate-500/80'} />
                      {isLabeled && (
                        <div className="absolute top-0 left-1 text-[10px] whitespace-nowrap">
                          {formatLabel(t)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {layers.map((layer) => (
              <TimelineLayerRow
                key={layer.id}
                layer={layer}
                selectedId={selectedId}
                onSelect={selectLayer}
                collapsedIds={collapsedIds}
                onToggleCollapse={toggleCollapse}
                pxPerSecond={pxPerSecond}
                timelineDuration={duration}
                labelWidth={labelWidth}
                trackWidth={trackWidth}
              />
            ))}

            <div
              className="absolute top-0 bottom-0 w-[2px] bg-accent z-[5] pointer-events-none"
              style={{ left: playheadX }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-0 bg-accent/10 z-[1]"
              style={{ left: labelWidth, width: currentTime * pxPerSecond }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
