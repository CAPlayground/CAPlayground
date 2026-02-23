import { Button } from "@/components/ui/button";
import { Crosshair } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type XY = { x: number; y: number };

interface GyroControlsProps {
  value?: XY;
  defaultValue?: XY;
  onChange?: (xy: XY) => void;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function GyroControls({
  value,
  defaultValue = { x: 0, y: 0 },
  onChange,
}: GyroControlsProps) {
  const [internal, setInternal] = useState<XY>(defaultValue);
  const [controlMode, setControlMode] = useState<'grid' | 'phone' | 'device'>('phone');
  const [deviceSupported, setDeviceSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const xy = value ?? internal;

  const setXY = useCallback(
    (next: XY) => {
      const clamped = {
        x: clamp(next.x, -1, 1),
        y: clamp(next.y, -1, 1),
      };
      if (value === undefined) setInternal(clamped);
      onChange?.(clamped);
    },
    [value, onChange]
  );

  const onRecenter = () => setXY({ x: 0, y: 0 });

  useEffect(() => {
    setXY({ x: 0, y: 0 });
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    if (isMobile && 'DeviceOrientationEvent' in window) {
      setDeviceSupported(true);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setPermissionGranted(true);
          setControlMode('device');
        }
      } catch (error) {
        console.error('Permission denied for device orientation');
      }
    } else {
      setPermissionGranted(true);
      setControlMode('device');
    }
  };

  useEffect(() => {
    if (controlMode !== 'device' || !deviceSupported) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0; 
      const normalizedY = clamp(beta / 90, -1, 1);
      const normalizedX = clamp(gamma / 45, -1, 1);

      setXY({ x: normalizedX, y: normalizedY });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [controlMode, deviceSupported, setXY]);

  const sensitivity = 50;
  const rotateX = useMemo(() => clamp((-xy.y) * sensitivity, -sensitivity, sensitivity), [xy.y]);
  const rotateY = useMemo(() => clamp((-xy.x) * sensitivity, -sensitivity, sensitivity), [xy.x]);

  return (
    <div
      className={
        "absolute flex flex-col bottom-2 left-2 z-10 gap-3 bg-white/80 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-3 shadow-sm"
      }
    >
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={controlMode === 'grid' ? 'default' : 'outline'}
          onClick={() => setControlMode('grid')}
          className="flex-1 h-7 text-[11px]"
        >
          Grid
        </Button>
        <Button
          size="sm"
          variant={controlMode === 'phone' ? 'default' : 'outline'}
          onClick={() => setControlMode('phone')}
          className="flex-1 h-7 text-[11px]"
        >
          Phone
        </Button>
        {deviceSupported && (
          <Button
            size="sm"
            variant={controlMode === 'device' ? 'default' : 'outline'}
            onClick={() => {
              if (!permissionGranted) {
                requestPermission();
              } else {
                setControlMode('device');
              }
            }}
            className="flex-1 h-7 text-[11px]"
          >
            Device
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center" style={{ minHeight: 224 }}>
        {controlMode === 'grid' && (
          <Pad value={xy} onChange={setXY} />
        )}
        {controlMode === 'phone' && (
          <PhoneTilt rotateX={rotateX} rotateY={rotateY} onDrag={setXY} />
        )}
        {controlMode === 'device' && (
          <DeviceGyro xy={xy} />
        )}
      </div>

      {controlMode !== 'device' && (
        <div className="text-neutral-400 flex items-center justify-center">
          <Button title="Re-center gyro" className="text-[10px]" variant="ghost" onClick={onRecenter}>
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Pad({
  value,
  onChange,
  size = 80,
}: {
  value: XY;
  onChange: (xy: XY) => void;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const handle = (clientX: number, clientY: number) => {
    const el = ref.current!;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;  // 0..1
    const y = (clientY - rect.top) / rect.height;  // 0..1

    const mappedX = clamp((0.5 - x) * 2, -1, 1);
    const mappedY = clamp((y - 0.5) * 2, -1, 1);

    onChange({ x: mappedX, y: mappedY });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handle(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    handle(e.clientX, e.clientY);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const knobLeft = `${((-value.x + 1) / 2) * 100}%`;
  const knobTop = `${(((value.y + 1) / 2) * 100)}%`;

  return (
    <div className="w-full">
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative mx-auto rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40 overflow-hidden"
        style={{ width: size, height: size * 2 }}
      >
        {/* grid */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-70">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="border border-neutral-200/60 dark:border-neutral-700/60"
            />
          ))}
        </div>

        {/* center crosshair */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="h-7 w-7 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600" />
        </div>

        {/* knob */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-neutral-900 shadow ring-2 ring-white dark:bg-white dark:ring-neutral-900 cursor-grab"
          style={{ left: knobLeft, top: knobTop }}
        />
      </div>

      {/* axis labels */}
      <div className="mt-2 text-[10px] text-neutral-400 flex items-center justify-between w-[80px] mx-auto">
        <span>L</span>
        <span>center</span>
        <span>R</span>
      </div>
    </div>
  );
}

function DeviceGyro({ xy }: { xy: XY }) {
  const sensitivity = 50;
  const rotateX = clamp((-xy.y) * sensitivity, -sensitivity, sensitivity);
  const rotateY = clamp((xy.x) * sensitivity, -sensitivity, sensitivity);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="relative mx-auto" style={{ width: 85, height: 150 }}>
        <div className="absolute inset-0 rounded-[1rem]" style={{
          boxShadow: "0 20px 45px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.2)",
          filter: "saturate(0.98)",
          transform: `perspective(200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 80ms linear",
        }}>
          <div className="absolute inset-0 rounded-[1rem] bg-neutral-900" style={{ transform: "translateZ(0px)" }} />

          <div className="absolute inset-0 rounded-[1rem]" style={{ padding: 5 }}>
            <div className="w-full h-full rounded-[0.7rem] bg-black overflow-hidden relative" style={{ transform: "translateZ(6px)" }}>
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black z-20" />
              <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% 100%, #38bdf8 0%, #0b1221 60%, #808080 100%)" }} />

              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-neutral-500 text-center">Tilt your device</p>
    </div>
  );
}

function PhoneTilt({ rotateX, rotateY, onDrag }: { rotateX: number; rotateY: number; onDrag: (v: { x: number; y: number }) => void; }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const handle = (clientX: number, clientY: number) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const nx = clamp((clientX - r.left) / r.width, 0, 1);
    const ny = clamp((clientY - r.top) / r.height, 0, 1);
    const x = (0.5 - nx) * 2;
    const y = (ny - 0.5) * 2;
    onDrag({ x, y });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); handle(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (!dragging.current) return; handle(e.clientX, e.clientY); }}
        onPointerUp={(e) => { dragging.current = false; (e.target as HTMLElement).releasePointerCapture(e.pointerId); }}
        className="relative mx-auto cursor-grab"
        style={{ width: 85, height: 150 }}
      >
        {/* shadow */}
        <div className="absolute inset-0 rounded-[1rem]" style={{
          boxShadow: "0 20px 45px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.2)",
          filter: "saturate(0.98)",
          transform: `perspective(200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 80ms linear",
        }}>
          {/* frame */}
          <div className="absolute inset-0 rounded-[1rem] bg-neutral-900" style={{ transform: "translateZ(0px)" }} />

          {/* glass */}
          <div className="absolute inset-0 rounded-[1rem]" style={{ padding: 5 }}>
            <div className="w-full h-full rounded-[0.7rem] bg-black overflow-hidden relative" style={{ transform: "translateZ(6px)" }}>
              {/* notch */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black z-20" />

              {/* wallpaper */}
              <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% 100%, #38bdf8 0%, #0b1221 60%, #808080 100%)" }} />

              {/* home bar */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-neutral-500 text-center">Drag the device to change tilt</p>
    </div>
  );
}
