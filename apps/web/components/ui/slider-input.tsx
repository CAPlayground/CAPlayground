import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SliderInputProps {
  label: string;
  value: number;
  bufferKey: string;
  getBuf: (key: string, defaultValue: string) => string;
  setBuf: (key: string, value: string) => void;
  clearBuf: (key: string) => void;
  onUpdateTransient: (value: number) => void;
  onUpdateCommitted: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  showPercentage?: boolean;
  className?: string;
  snapPoints?: number[];
  snapThreshold?: number;
  showSnapLabels?: boolean;
  showDots?: boolean;
}

export function SliderInput({
  label,
  value,
  bufferKey,
  getBuf,
  setBuf,
  clearBuf,
  onUpdateTransient,
  onUpdateCommitted,
  disabled = false,
  min = 0,
  max = 400,
  step = 1,
  showPercentage = true,
  className,
  snapPoints = [100, 200, 300],
  snapThreshold = 0.05,
  showSnapLabels = false,
  showDots = true,
}: SliderInputProps) {
  const displayValue = showPercentage ? Math.round(value * 100) : value;
  const bufferValue = getBuf(bufferKey, String(displayValue));

  const snapValue = (val: number) => {
    if (!snapPoints) return val;
    for (const point of snapPoints) {
      const value = showPercentage ? point / 100 : point;
      if (Math.abs(val - value) <= snapThreshold) {
        return value;
      }
    }
    return val;
  };

  return (
    <div className={cn("space-y-1", className)}>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 relative">
          <Slider
            value={[displayValue]}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onValueChange={(e) => {
              const newValue = snapValue(showPercentage ? e[0] / 100 : e[0]);
              onUpdateTransient(newValue);
            }}
            onValueCommit={(e) => {
              const newValue = snapValue(showPercentage ? e[0] / 100 : e[0]);
              onUpdateCommitted(newValue);
            }}
            className="[&_[data-slot=slider-range]]:bg-transparent"
          />
          {showDots && snapPoints && snapPoints.map((point) => {
            const leftPercent = ((point - min) / (max - min)) * 100;
            return (
              <div
                key={`dot-${point}`}
                className="grid place-items-center absolute size-4 rounded-full pointer-events-none"
                style={{ left: `${leftPercent}%`, top: '50%', transform: `translate(-${leftPercent}%, -50%)` }}
              >
                <span className="bg-gray-500 rounded-full w-1 h-1" />
                {showSnapLabels && (
                  <span
                    key={point}
                    className="pointer-events-auto text-xs text-gray-500 absolute transform top-[100%] cursor-pointer hover:text-gray-700"
                    onClick={() => {
                      onUpdateTransient(showPercentage ? point / 100 : point);
                    }}
                  >
                    {point}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="relative">
          <Input
            type="number"
            value={bufferValue}
            min={min}
            step={step}
            disabled={disabled}
            onChange={(e) => setBuf(bufferKey, e.target.value)}
            onBlur={() => {
              const v = bufferValue.trim();
              const num = v === "" ? 0 : (showPercentage ? Number(v) / 100 : Number(v));
              if (Number.isFinite(num)) {
                onUpdateCommitted(num);
                clearBuf(bufferKey);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
                e.preventDefault();
              }
            }}
            className={cn(
              "w-16 h-8 text-right",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              showPercentage && "pr-4 pl-1"
            )}
          />
          {showPercentage && (
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
          )}
        </div>
      </div>
    </div>
  );
}
