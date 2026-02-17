"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RotationKnobProps {
  value: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: number;
  label?: string;
  className?: string;
  unit?: string;
  step?: number;
  snapToOrthogonal?: boolean;
}

export function RotationKnob({
  value,
  onChange,
  onChangeEnd,
  min = -Infinity,
  max = Infinity,
  disabled = false,
  size = 72,
  label,
  className,
  unit = "°",
  step = 1,
  snapToOrthogonal = true,
}: RotationKnobProps) {
  const knobRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(String(value));
  const [isShiftHeld, setIsShiftHeld] = React.useState(false);
  const lastAngleRef = React.useRef(0);
  const accumulatedValueRef = React.useRef(0);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const MAGNETIC_THRESHOLD = 10;

  const snapValue = (v: number) => {
    if (isShiftHeld) {
      // If shift is held, snap to 15x step (or 15 degrees if step is 1)
      // For small steps (0.01), 15x might be too small/large, but let's keep it simple for now
      // or just default to 15 degree increments if it's rotation?
      // Let's make it 10x step for generic
      const shiftStep = step * 10;
      return Math.round(v / shiftStep) * shiftStep;
    }

    if (snapToOrthogonal) {
      const nearest90 = Math.round(v / 90) * 90;
      const distanceTo90 = Math.abs(v - nearest90);

      if (distanceTo90 <= MAGNETIC_THRESHOLD) {
        return nearest90;
      }
    }

    return Math.round(v / step) * step;
  };

  const displayAngle = ((value % 360) + 360) % 360;

  const getAngleFromPoint = (clientX: number, clientY: number) => {
    if (!knobRef.current) return 0;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    return (Math.atan2(deltaX, -deltaY) * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    lastAngleRef.current = getAngleFromPoint(e.clientX, e.clientY);
    accumulatedValueRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || disabled) return;
    const currentAngle = getAngleFromPoint(e.clientX, e.clientY);
    let angleDelta = currentAngle - lastAngleRef.current;

    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;

    // Scale delta based on step? 
    // If step is small (0.01), 1 degree of rotation should maybe correspond to more change?
    // For now keep 1 degree rotation = 1 unit change, unless it's way too fast.
    // If step is user defined, we might want sensitivity.
    // But rotation knobs usually map angle directly. 
    // Let's leave 1:1 for now.

    accumulatedValueRef.current += angleDelta;
    lastAngleRef.current = currentAngle;

    const snapped = snapValue(accumulatedValueRef.current);
    // Fix float precision issues
    const precision = step.toString().split('.')[1]?.length || 0;
    const fixed = Number(snapped.toFixed(precision));

    const newValue = Math.max(min, Math.min(max, fixed));
    onChange?.(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const snapped = snapValue(accumulatedValueRef.current);
    const precision = step.toString().split('.')[1]?.length || 0;
    const fixed = Number(snapped.toFixed(precision));

    const newValue = Math.max(min, Math.min(max, fixed));
    onChangeEnd?.(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const num = parseFloat(e.target.value);
    if (!Number.isNaN(num)) {
      const precision = step.toString().split('.')[1]?.length || 0;
      const rounded = Number(num.toFixed(precision));
      const clamped = Math.max(min, Math.min(max, rounded));
      onChange?.(clamped);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setInputValue(String(value));
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const num = parseFloat(inputValue);
    if (!Number.isNaN(num)) {
      const precision = step.toString().split('.')[1]?.length || 0;
      const rounded = Number(num.toFixed(precision));
      const clamped = Math.max(min, Math.min(max, rounded));
      onChangeEnd?.(clamped);
    } else {
      setInputValue(String(value));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setInputValue(String(value));
      (e.target as HTMLInputElement).blur();
    }
  };

  React.useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const ticks = [0, 90, 180, 270];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        ref={knobRef}
        className={cn(
          "relative rounded-full select-none cursor-text",
          "bg-gradient-to-b from-muted/50 to-muted",
          "border-2 border-border/50",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.2)]",
          "transition-all duration-150",
          isDragging && "border-primary/50",
          isFocused && !isDragging && "border-primary/80",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ width: size, height: size }}
        onClick={() => {
          if (disabled || isDragging) return;
          setIsFocused(true);
          setInputValue(String(value));
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
        >
          {ticks.map((angle, i) => {
            const radian = (angle - 90) * (Math.PI / 180);
            const innerR = 36;
            const outerR = 46;
            const x1 = 50 + innerR * Math.cos(radian);
            const y1 = 50 + innerR * Math.sin(radian);
            const x2 = 50 + outerR * Math.cos(radian);
            const y2 = 50 + outerR * Math.sin(radian);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={2.5}
                className="text-muted-foreground/70"
              />
            );
          })}
        </svg>

        {(() => {
          const dotSize = size * 0.22;
          const orbitRadius = size * 0.5;
          const angleRad = (displayAngle - 90) * (Math.PI / 180);
          const dotX = size / 2 + orbitRadius * Math.cos(angleRad) - dotSize / 2;
          const dotY = size / 2 + orbitRadius * Math.sin(angleRad) - dotSize / 2;
          return (
            <div
              className={cn(
                "absolute rounded-full cursor-grab touch-none",
                "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]",
                "hover:scale-110 hover:shadow-[0_0_10px_hsl(var(--primary)/0.8)]",
                "transition-[transform,box-shadow] duration-100",
                isDragging && "cursor-grabbing scale-110 shadow-[0_0_12px_hsl(var(--primary))]",
                disabled && "cursor-not-allowed"
              )}
              style={{
                width: dotSize,
                height: dotSize,
                left: dotX,
                top: dotY,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => e.stopPropagation()}
            />
          );
        })()}

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {label && (
            <span className="text-[12px] text-muted-foreground font-medium mb-0.5">{label}</span>
          )}
          <div className="relative pointer-events-auto">
            {isFocused ? (
              <input
                ref={inputRef}
                type="number"
                step={step}
                className={cn(
                  "w-16 h-5 text-center text-sm font-mono font-medium",
                  "bg-transparent border-none outline-none",
                  "text-foreground",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={cn(
                  "text-sm font-mono font-medium text-foreground/80 hover:text-foreground",
                  "cursor-text focus:outline-none",
                  disabled && "pointer-events-none"
                )}
                onClick={() => {
                  setIsFocused(true);
                  setInputValue(String(value));
                }}
                onFocus={() => {
                  setIsFocused(true);
                  setInputValue(String(value));
                }}
                disabled={disabled}
              >
                {value}
                {unit && (
                  <span className="absolute top-0 -right-1.5 text-[10px] text-muted-foreground/70 -ml-1 whitespace-nowrap translate-x-full">{unit}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
