import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEditor } from "../editor-context";
import { applyOverrides } from "../canvas-preview/utils/layerApplication";
import LockScreen, { TopBar } from "./LockScreen";
import { AnyLayer } from "@/lib/ca/types";
import { interpolateLayers } from "@/lib/editor/layer-utils";

const PHONE_STATES = {
  LOCKED: "Locked",
  UNLOCK: "Unlock",
  SLEEP: "Sleep",
};

type Props = {
  children: React.ReactNode;
  showPreview: boolean;
  setPreviewLayers: (layers: AnyLayer[] | null) => void;
  scale: number;
}

export default function DevicePreview({
  children,
  showPreview,
  setPreviewLayers,
  scale,
}: Props) {
  const { doc } = useEditor();
  const {
    floating,
    background,
  } = doc?.docs || {}
  const canvasWidth = doc?.meta.width ?? 390;
  const canvasHeight = doc?.meta.height ?? 844;

  const [phoneState, setPhoneState] = useState(PHONE_STATES.LOCKED);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimatingToSleep, setIsAnimatingToSleep] = useState(false);
  const [isAnimatingFromSleep, setIsAnimatingFromSleep] = useState(false);
  const [isAnimatingDragCancel, setIsAnimatingDragCancel] = useState(false);
  const [isAnimatingDragComplete, setIsAnimatingDragComplete] = useState(false);
  const toSleepAnimationRef = useRef<number | null>(null);
  const fromSleepAnimationRef = useRef<number | null>(null);
  const dragCancelAnimationRef = useRef<number | null>(null);
  const dragCompleteAnimationRef = useRef<number | null>(null);
  const sleepAnimationStartRef = useRef<number | null>(null);
  const previousStateRef = useRef(PHONE_STATES.LOCKED);
  const wasSleepingRef = useRef(false);
  const dragCancelStartRef = useRef<number | null>(null);
  const dragCancelFromProgressRef = useRef<number>(0);
  const dragCompleteStartRef = useRef<number | null>(null);
  const dragCompleteFromProgressRef = useRef<number>(0);
  const dragCompleteTargetStateRef = useRef<string>(PHONE_STATES.UNLOCK);

  const updateLayersWithProgress = useCallback((targetState: string, progress: number) => {
    if (!showPreview) return;

    const floatingOverrides = floating?.stateOverrides || {};
    const backgroundOverrides = background?.stateOverrides || {};

    const baseFloatingLayers = floating?.layers || [];
    const baseBackgroundLayers = background?.layers || [];

    const currentFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, phoneState);
    const currentBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, phoneState);

    const targetFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, targetState);
    const targetBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, targetState);

    const interpolatedFloating = interpolateLayers(currentFloatingLayers, targetFloatingLayers, progress);
    const interpolatedBackground = interpolateLayers(currentBackgroundLayers, targetBackgroundLayers, progress);

    setPreviewLayers([
      ...interpolatedBackground,
      ...interpolatedFloating,
    ]);
  }, [showPreview, floating, background, phoneState, setPreviewLayers]);

  useEffect(() => {
    if (!showPreview) {
      setPreviewLayers(null);
    } else {
      setPhoneState(PHONE_STATES.LOCKED);
      setDragOffset(0);
      const floatingOverrides = floating?.stateOverrides || {};
      const backgroundOverrides = background?.stateOverrides || {};

      const baseFloatingLayers = floating?.layers || [];
      const baseBackgroundLayers = background?.layers || [];

      const lockedFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, PHONE_STATES.LOCKED);
      const lockedBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, PHONE_STATES.LOCKED);

      setPreviewLayers([
        ...lockedBackgroundLayers,
        ...lockedFloatingLayers,
      ]);
    }
  }, [showPreview, floating, background]);

  useEffect(() => {
    if (phoneState === PHONE_STATES.SLEEP && !isAnimatingToSleep && !wasSleepingRef.current) {
      const fromState = previousStateRef.current;
      setIsAnimatingToSleep(true);
      sleepAnimationStartRef.current = performance.now();
      wasSleepingRef.current = true;

      const animate = (currentTime: number) => {
        if (!sleepAnimationStartRef.current) return;

        const elapsed = currentTime - sleepAnimationStartRef.current;
        const duration = 500;
        const progress = Math.min(elapsed / duration, 1);

        const floatingOverrides = floating?.stateOverrides || {};
        const backgroundOverrides = background?.stateOverrides || {};

        const baseFloatingLayers = floating?.layers || [];
        const baseBackgroundLayers = background?.layers || [];

        const fromFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, fromState);
        const fromBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, fromState);

        const targetFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, PHONE_STATES.SLEEP);
        const targetBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, PHONE_STATES.SLEEP);

        const interpolatedFloating = interpolateLayers(fromFloatingLayers, targetFloatingLayers, progress);
        const interpolatedBackground = interpolateLayers(fromBackgroundLayers, targetBackgroundLayers, progress);

        setPreviewLayers([
          ...interpolatedBackground,
          ...interpolatedFloating,
        ]);

        if (progress < 1) {
          toSleepAnimationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimatingToSleep(false);
          sleepAnimationStartRef.current = null;
        }
      };

      toSleepAnimationRef.current = requestAnimationFrame(animate);

      return () => {
        if (toSleepAnimationRef.current) {
          cancelAnimationFrame(toSleepAnimationRef.current);
        }
        setIsAnimatingToSleep(false);
        sleepAnimationStartRef.current = null;
      };
    }

    if (phoneState !== PHONE_STATES.SLEEP) {
      previousStateRef.current = phoneState;
    }
  }, [phoneState, floating, background]);

  useEffect(() => {
    if (phoneState !== PHONE_STATES.SLEEP && wasSleepingRef.current && !isAnimatingFromSleep) {
      const targetState = phoneState;
      setIsAnimatingFromSleep(true);
      sleepAnimationStartRef.current = performance.now();

      const animate = (currentTime: number) => {
        if (!sleepAnimationStartRef.current) return;

        const elapsed = currentTime - sleepAnimationStartRef.current;
        const duration = 500;
        const progress = Math.min(elapsed / duration, 1);

        const floatingOverrides = floating?.stateOverrides || {};
        const backgroundOverrides = background?.stateOverrides || {};

        const baseFloatingLayers = floating?.layers || [];
        const baseBackgroundLayers = background?.layers || [];

        const fromFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, PHONE_STATES.SLEEP);
        const fromBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, PHONE_STATES.SLEEP);

        const targetFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, targetState);
        const targetBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, targetState);

        const interpolatedFloating = interpolateLayers(fromFloatingLayers, targetFloatingLayers, progress);
        const interpolatedBackground = interpolateLayers(fromBackgroundLayers, targetBackgroundLayers, progress);

        setPreviewLayers([
          ...interpolatedBackground,
          ...interpolatedFloating,
        ]);

        if (progress < 1) {
          fromSleepAnimationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimatingFromSleep(false);
          sleepAnimationStartRef.current = null;
          wasSleepingRef.current = false;
        }
      };

      fromSleepAnimationRef.current = requestAnimationFrame(animate);

      return () => {
        if (fromSleepAnimationRef.current) {
          cancelAnimationFrame(fromSleepAnimationRef.current);
        }
        setIsAnimatingFromSleep(false);
        sleepAnimationStartRef.current = null;
        wasSleepingRef.current = false;
      };
    }
  }, [phoneState, floating, background]);

  useEffect(() => {
    if (isAnimatingDragCancel) {
      const startProgress = dragCancelFromProgressRef.current;
      dragCancelStartRef.current = performance.now();

      const animate = (currentTime: number) => {
        if (!dragCancelStartRef.current) return;

        const elapsed = currentTime - dragCancelStartRef.current;
        const duration = 300;
        const progress = Math.min(elapsed / duration, 1);

        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const currentInterpolation = startProgress * (1 - easeProgress);

        const targetState = phoneState === PHONE_STATES.LOCKED ? PHONE_STATES.UNLOCK : PHONE_STATES.LOCKED;

        updateLayersWithProgress(targetState, currentInterpolation);

        if (progress < 1) {
          dragCancelAnimationRef.current = requestAnimationFrame(animate);
        } else {
          const floatingOverrides = floating?.stateOverrides || {};
          const backgroundOverrides = background?.stateOverrides || {};
          const baseFloatingLayers = floating?.layers || [];
          const baseBackgroundLayers = background?.layers || [];

          const currentFloatingLayers = applyOverrides(baseFloatingLayers, floatingOverrides, phoneState);
          const currentBackgroundLayers = applyOverrides(baseBackgroundLayers, backgroundOverrides, phoneState);

          setPreviewLayers([
            ...currentBackgroundLayers,
            ...currentFloatingLayers,
          ]);

          setIsAnimatingDragCancel(false);
          dragCancelStartRef.current = null;
          dragCancelFromProgressRef.current = 0;
        }
      };

      dragCancelAnimationRef.current = requestAnimationFrame(animate);

      return () => {
        if (dragCancelAnimationRef.current) {
          cancelAnimationFrame(dragCancelAnimationRef.current);
        }
      };
    }
  }, [isAnimatingDragCancel, phoneState, floating, background, updateLayersWithProgress]);

  useEffect(() => {
    if (isAnimatingDragComplete) {
      const startProgress = dragCompleteFromProgressRef.current;
      const targetState = dragCompleteTargetStateRef.current;
      dragCompleteStartRef.current = performance.now();

      const animate = (currentTime: number) => {
        if (!dragCompleteStartRef.current) return;

        const elapsed = currentTime - dragCompleteStartRef.current;
        const duration = 200;
        const progress = Math.min(elapsed / duration, 1);

        const easeProgress = 1 - Math.pow(1 - progress, 2);

        const currentInterpolation = startProgress + (1 - startProgress) * easeProgress;
        updateLayersWithProgress(targetState, currentInterpolation);

        if (progress < 1) {
          dragCompleteAnimationRef.current = requestAnimationFrame(animate);
        } else {
          setPhoneState(targetState);
          setIsAnimatingDragComplete(false);
          dragCompleteStartRef.current = null;
          dragCompleteFromProgressRef.current = 0;
        }
      };

      dragCompleteAnimationRef.current = requestAnimationFrame(animate);

      return () => {
        if (dragCompleteAnimationRef.current) {
          cancelAnimationFrame(dragCompleteAnimationRef.current);
        }
      };
    }
  }, [isAnimatingDragComplete, floating, background, updateLayersWithProgress]);

  const dragStartYRef = useRef<number | null>(null);
  const dragDirectionRef = useRef<"up" | "down" | null>(null);
  const phoneScreenRef = useRef<HTMLDivElement | null>(null);
  const dragStartElementRef = useRef<"home-bar" | "status-bar" | null>(null);

  const handleSideButtonClick = () => {
    if (phoneState === PHONE_STATES.SLEEP) {
      setPhoneState(PHONE_STATES.LOCKED);
      setDragOffset(0);
    } else {
      setPhoneState(PHONE_STATES.SLEEP);
    }
  };

  const handleScreenClick = () => {
    if (!isAnimatingToSleep && !isAnimatingFromSleep && phoneState === PHONE_STATES.SLEEP) {
      setPhoneState(PHONE_STATES.LOCKED);
      setDragOffset(0);
    }
  };

  const onDragStart = (clientY: number, element: "home-bar" | "status-bar") => {
    if (phoneState === PHONE_STATES.LOCKED && element !== "home-bar") return;
    if (phoneState === PHONE_STATES.UNLOCK && element !== "status-bar") return;

    setIsDragging(true);
    dragStartYRef.current = clientY;
    dragStartElementRef.current = element;
    dragDirectionRef.current = null;
  };

  const onDragMove = (clientY: number) => {
    if (!isDragging || dragStartYRef.current == null || !phoneScreenRef.current) return;

    const screenHeight = phoneScreenRef.current.clientHeight;
    const delta = clientY - dragStartYRef.current;

    if (!dragDirectionRef.current) {
      if (Math.abs(delta) > 5) {
        dragDirectionRef.current = delta < 0 ? "up" : "down";
      }
    }

    const progress = Math.min(Math.abs(delta) / screenHeight, 1);

    if (phoneState === PHONE_STATES.LOCKED && delta < 0) {
      setDragOffset(Math.max(delta, -screenHeight));
      updateLayersWithProgress(PHONE_STATES.UNLOCK, progress);
    } else if (phoneState === PHONE_STATES.UNLOCK && delta > 0) {
      setDragOffset(-screenHeight + Math.min(delta, screenHeight));
      updateLayersWithProgress(PHONE_STATES.LOCKED, progress);
    }
  };

  const onDragEnd = () => {
    if (!isDragging || !phoneScreenRef.current) return;

    const screenHeight = phoneScreenRef.current.clientHeight;

    let currentProgress = 0;
    if (phoneState === PHONE_STATES.LOCKED) {
      currentProgress = Math.min(Math.abs(dragOffset) / screenHeight, 1);
    } else if (phoneState === PHONE_STATES.UNLOCK) {
      currentProgress = Math.min((screenHeight + dragOffset) / screenHeight, 1);
    }

    const thresholdMet = currentProgress >= 0.5;

    if (
      phoneState === PHONE_STATES.LOCKED &&
      dragDirectionRef.current === "up" &&
      thresholdMet
    ) {
      // Threshold met - animate completion from current progress to 100%
      dragCompleteFromProgressRef.current = currentProgress;
      dragCompleteTargetStateRef.current = PHONE_STATES.UNLOCK;
      setIsAnimatingDragComplete(true);
      setDragOffset(-screenHeight);
    } else if (
      phoneState === PHONE_STATES.UNLOCK &&
      dragDirectionRef.current === "down" &&
      thresholdMet
    ) {
      dragCompleteFromProgressRef.current = currentProgress;
      dragCompleteTargetStateRef.current = PHONE_STATES.LOCKED;
      setIsAnimatingDragComplete(true);
      setDragOffset(0);
    } else if (currentProgress > 0) {
      dragCancelFromProgressRef.current = currentProgress;
      setIsAnimatingDragCancel(true);
      setDragOffset(phoneState === PHONE_STATES.UNLOCK ? -screenHeight : 0);
    }

    setIsDragging(false);
    dragStartYRef.current = null;
    dragDirectionRef.current = null;
  };

  const handleHomeBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart(e.clientY, "home-bar");
  };

  const handleHomeBarTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    onDragStart(touch.clientY, "home-bar");
  };

  const handleStatusBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart(e.clientY, "status-bar");
  };

  const handleStatusBarTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    onDragStart(touch.clientY, "status-bar");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    onDragMove(e.clientY);
  };

  const handleMouseUp = () => {
    onDragEnd();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    onDragMove(touch.clientY);
  };

  const handleTouchEnd = () => {
    onDragEnd();
  };

  let homeBarTranslateY = 0;

  if (phoneState === PHONE_STATES.LOCKED) {
    homeBarTranslateY = dragOffset;
  } else if (phoneState === PHONE_STATES.UNLOCK) {
    homeBarTranslateY = dragOffset;
  }

  const isSleep = phoneState === PHONE_STATES.SLEEP;
  const isLocked = phoneState === PHONE_STATES.LOCKED;
  const isUnlocked = phoneState === PHONE_STATES.UNLOCK;


  if (!showPreview) return children;
  return (
    <div
      className={'flex flex-col items-center justify-center w-full h-full select-none'}
      style={{ background: 'radial-gradient(circle at top, #222 0%, #000 60%)' }}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={isDragging ? handleMouseUp : undefined}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
      onTouchMove={isDragging ? handleTouchMove : undefined}
      onTouchEnd={isDragging ? handleTouchEnd : undefined}
    >
      <div
        className="relative rounded-[48px] p-2 flex shrink-0 items-stretch justify-center shadow-[0_0_0_3px_#000,0_20px_40px_rgba(0,0,0,0.7)]"
        style={{
          background: 'linear-gradient(145deg, #444, #111)',
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          boxSizing: 'content-box',
          transform: `scale(${scale})`,
        }}
      >
        <button
          className="absolute -right-3.5 top-[90px] w-3 h-[60px] rounded-[3px] bg-[#555] border-none cursor-pointer active:translate-x-px"
          onClick={handleSideButtonClick}
          disabled={isAnimatingDragCancel || isAnimatingDragComplete || isAnimatingToSleep || isAnimatingFromSleep}
        />

        <div
          ref={phoneScreenRef}
          className={`relative flex-1 rounded-[40px] overflow-hidden bg-black flex flex-col select-none ${
            isSleep ? 'brightness-[0.7]' : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
          }`}
          onClick={handleScreenClick}
        >
          <div className="absolute inset-0 overflow-hidden">
            {children}
          </div>

          <LockScreen
            onHomeBarMouseDown={handleHomeBarMouseDown}
            onHomeBarTouchStart={handleHomeBarTouchStart}
            isDragging={isDragging}
            homeBarTranslateY={homeBarTranslateY}
            showTopBar={!isSleep}
            showBottomBar={!isSleep}
            showButtons={!isSleep}
          />

          {isUnlocked && (
            <div className="absolute inset-0 flex flex-col text-white">
              <div
                className="cursor-grab select-none touch-none active:cursor-grabbing"
                onMouseDown={handleStatusBarMouseDown}
                onTouchStart={handleStatusBarTouchStart}
              >
                <TopBar showTopBar />
              </div>
              <div className="flex-1 flex items-end justify-center pb-5">
                <div className="grid grid-cols-4 gap-5 p-5 rounded-[28px] bg-white/10">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-14 h-14 rounded-2xl bg-white/20" />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
