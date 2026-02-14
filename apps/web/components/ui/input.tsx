import * as React from "react"

import { cn } from "@/lib/utils"
import { useLocalStorage } from "@/hooks/use-local-storage"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onPointerDown, onPointerMove, onPointerUp, onBlur, ...props }, forwardedRef) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragSensitivity] = useLocalStorage<number>("caplay_settings_drag_sensitivity", 3);
    const startX = React.useRef(0);
    const startValue = React.useRef(0);
    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(forwardedRef, () => internalRef.current!);

    const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
      if (type === "number" && !props.disabled && !props.readOnly) {
        startX.current = e.clientX;
        startValue.current = Number(props.value) || 0;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      onPointerDown?.(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        const dx = e.clientX - startX.current;
        if (!isDragging && Math.abs(dx) > 3) {
          setIsDragging(true);
        }

        if (isDragging) {
          const step = Number(props.step) || 1;
          const sensitivity = (e.shiftKey ? 0.1 : 1) * dragSensitivity;
          const delta = dx * step * sensitivity;
          const newValue = startValue.current + delta;

          let finalValue = newValue;
          if (props.min !== undefined) finalValue = Math.max(Number(props.min), finalValue);
          if (props.max !== undefined) finalValue = Math.min(Number(props.max), finalValue);

          const precision = step.toString().split(".")[1]?.length || 0;
          const formattedValue = finalValue.toFixed(precision);

          if (onChange && internalRef.current) {
            internalRef.current.value = formattedValue;
            const event = {
              target: internalRef.current,
              currentTarget: internalRef.current,
              type: 'change'
            } as any;
            onChange(event);
          }
          return;
        }
      }
      onPointerMove?.(e);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
      if (isDragging) {
        setIsDragging(false);
        if (onBlur && internalRef.current) {
          onBlur({ target: internalRef.current, currentTarget: internalRef.current } as any);
        }
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      onPointerUp?.(e);
    };

    return (
      <input
        ref={internalRef}
        type={type}
        data-slot="input"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-ring selection:text-primary-foreground bg-background dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          type === "number" && "cursor-ew-resize",
          isDragging && "select-none cursor-ew-resize",
          className
        )}
        onChange={onChange}
        onBlur={onBlur}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
