import { useLocalStorage } from "@/hooks/use-local-storage";
import { Camera, Flashlight } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

interface LockScreenProps {
  onHomeBarMouseDown?: (e: React.MouseEvent) => void;
  onHomeBarTouchStart?: (e: React.TouchEvent) => void;
  isDragging?: boolean;
  homeBarTranslateY?: number;
  showTopBar?: boolean;
  showBottomBar?: boolean;
  showButtons?: boolean;
}

const getTime = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const displayHours = hours;
  return { now, hours, minutes, displayHours };
}

export default function IOSLockScreen({
  onHomeBarMouseDown,
  onHomeBarTouchStart,
  isDragging = false,
  homeBarTranslateY = 0,
  showTopBar = true,
  showBottomBar = true,
  showButtons = true
}: LockScreenProps) {
  return (
    <div
      className={`absolute rounded-[48px] inset-0 flex flex-col justify-between text-white pointer-events-none ${isDragging ? '' : 'transition-transform duration-150 ease-out'
        }`}
      style={{
        background: isDragging ? 'linear-gradient(to top, #fafafa4f 0%, transparent 10%)' : '',
        transform: `translateY(${homeBarTranslateY}px)`,
      }}
    >
      <TopBar showTopBar={showTopBar} />

      <LockScreenClock homeBarTranslateY={homeBarTranslateY} />

      <div
        className="flex justify-between items-end px-12 pb-8 pointer-events-auto transition-opacity duration-800 ease-out"
        style={{ opacity: showButtons ? 1 : 0 }}
      >
        <button
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform"
        >
          <Flashlight />
        </button>

        <button
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform"
        >
          <Camera />
        </button>
      </div>

      {showBottomBar &&
        <div className="absolute w-full bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 p-5  pointer-events-auto cursor-grab active:cursor-grabbing select-none touch-none"
          onMouseDown={onHomeBarMouseDown}
          onTouchStart={onHomeBarTouchStart}
        >
          <div
            className="w-[120px] h-1.5 rounded-full bg-white/75"
          />
        </div>}
    </div>
  );
}

export const TopBar = ({
  showTopBar,
}: {
  showTopBar: boolean;
}) => {
  const { minutes, displayHours } = getTime();
  return (
    <div
      className="flex h-[35px] w-full justify-between items-center px-7 pt-4 text-sm font-semibold transition-opacity duration-800 ease-out"
      style={{ opacity: showTopBar ? 1 : 0 }}
    >
      <div className="text-sm font-semibold tracking-tight">
        {displayHours}:{minutes}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-0.5">
          <div className="w-[3px] h-[4px] bg-white rounded-sm" />
          <div className="w-[3px] h-[6px] bg-white rounded-sm" />
          <div className="w-[3px] h-[8px] bg-white rounded-sm" />
          <div className="w-[3px] h-[10px] bg-white rounded-sm" />
        </div>
        <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
        </svg>
        <div className="flex items-center justify-center w-[24px] h-[13px] bg-white rounded-sm relative">
          <div className="absolute right-[-2px] top-[4px] w-[2px] h-[5px] bg-white rounded-r-sm" />
          <span className="text-[10px] text-gray-400">100</span>
        </div>
      </div>
    </div>
  )
}

export const LockScreenClock = ({ homeBarTranslateY }: { homeBarTranslateY: number }) => {
  const { minutes, displayHours, now } = getTime();
  const [clockDepthEffect] = useLocalStorage<boolean>("caplay_preview_clock_depth", false);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const date = now.getDate();

  const clockContent = (
    <div
      className="flex-1 flex flex-col items-center mt-14"
      style={{ transform: `translateY(${clockDepthEffect ? homeBarTranslateY : 0}px)` }}
    >
      <div className="text-lg font-medium tracking-wide">
        {dayName} {date} {monthName}
      </div>
      <div className="text-[120px] font-bold leading-[100px] tracking-tight">
        {displayHours}:{minutes}
      </div>
    </div>
  );

  if (clockDepthEffect && typeof document !== 'undefined') {
    const lockScreenEl = document.getElementById('lock-screen-clock');
    
    if (lockScreenEl) {
      return createPortal(clockContent, lockScreenEl);
    }
  }

  return clockContent;
};