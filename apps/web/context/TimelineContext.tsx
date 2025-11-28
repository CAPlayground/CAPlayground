import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

type TimelineContextType = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setTime: (t: number) => void;
  setDuration: (d: number) => void;
};

const TimelineContext = createContext<TimelineContextType | null>(null);

export const useTimeline = () => {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error("useTimeline must be used inside <TimelineProvider>");
  return ctx;
};

type Props = {
  children: ReactNode;
  initialDuration?: number;
};

export const TimelineProvider: React.FC<Props> = ({
  children,
  initialDuration = Infinity,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [isPlaying, setIsPlaying] = useState(false);

  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const setTime = useCallback((t: number) => {
    setCurrentTime(Math.max(0, Math.min(t, duration)));
  }, [duration]);

  const tick = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    if (lastFrameTimeRef.current == null) {
      lastFrameTimeRef.current = timestamp;
    }

    const delta = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    setCurrentTime(prev => {
      const next = prev + delta;

      if (next >= duration) {
        setIsPlaying(false);
        return duration;
      }
      return next;
    });

    rafIdRef.current = requestAnimationFrame(tick);
  }, [isPlaying, duration]);

  const play = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
  }, [isPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = null;
      rafIdRef.current = requestAnimationFrame(tick);
    } else if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, tick]);

  const value: TimelineContextType = {
    currentTime,
    duration,
    isPlaying,
    play,
    pause,
    stop,
    setTime,
    setDuration,
  };

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
};
