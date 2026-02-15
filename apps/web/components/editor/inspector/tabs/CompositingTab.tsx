"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { InspectorTabProps } from "../types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { TabId } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blendModes } from "@/lib/blending";

interface CompositingTabProps extends InspectorTabProps {
  setActiveTab: (tab: TabId) => void;
  activeState?: string;
}

export function CompositingTab({
  selected,
  updateLayer,
  updateLayerTransient,
  getBuf,
  setBuf,
  clearBuf,
  fmt0,
  setActiveTab,
  activeState,
}: CompositingTabProps) {
  const inState = !!activeState && activeState !== 'Base State';
  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      <div className="space-y-1 col-span-2">
        <Label htmlFor="blendMode">Blending</Label>
        <Select
          value={selected.blendMode}
          onValueChange={(v) => updateLayer(selected.id, { blendMode: v as any } as any)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select blending mode" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(blendModes).map((mode) => (
              <SelectItem key={mode.id} value={mode.id}>
                {mode.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 col-span-2">
        <Label htmlFor="opacity">Opacity</Label>
        <div className="flex items-center gap-2 w-full">
          <Slider
            id="opacity"
            value={[Math.round((typeof selected.opacity === 'number' ? selected.opacity : 1) * 100)]}
            min={0}
            max={100}
            step={1}
            onValueChange={([p]) => {
              const clamped = Math.max(0, Math.min(100, Math.round(Number(p))));
              const val = Math.round((clamped / 100) * 100) / 100; // 2 d.p.
              updateLayerTransient(selected.id, { opacity: val as any } as any);
            }}
            onValueCommit={([p]) => {
              const clamped = Math.max(0, Math.min(100, Math.round(Number(p))));
              const val = Math.round((clamped / 100) * 100) / 100; // 2 d.p.
              updateLayer(selected.id, { opacity: val as any } as any);
            }}
          />
          <Input
            id="opacityPct"
            className="w-24 h-8 text-right"
            type="number"
            min={0}
            max={100}
            step={1}
            value={getBuf('opacityPct', String(Math.round((typeof selected.opacity === 'number' ? selected.opacity : 1) * 100)))}
            onChange={(e) => {
              setBuf('opacityPct', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const p = Math.max(0, Math.min(100, Math.round(Number(v))));
              const val = Math.round((p / 100) * 100) / 100;
              updateLayerTransient(selected.id, { opacity: val as any } as any);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const p = v === "" ? undefined : Math.max(0, Math.min(100, Math.round(Number(v))));
              const val = typeof p === 'number' ? Math.round((p / 100) * 100) / 100 : undefined;
              updateLayer(selected.id, { opacity: (typeof val === 'number') ? val as any : (undefined as any) } as any);
              clearBuf('opacityPct');
            }}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <div className="col-span-2 -mt-1">
          <p className="text-[11px] text-muted-foreground">
            Opacity affects the entire layer (content, background, and sublayers). If you only want to fade the
            background fill behind the content, use
            {' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setActiveTab('content')}
            >
              Content → Background opacity
            </button>.
          </p>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="radius">Corner Radius</Label>
        <Input
          id="radius"
          type="number"
          step="1"
          value={getBuf('cornerRadius', fmt0((selected as any).cornerRadius ?? (selected as any).radius))}
          onChange={(e) => {
            setBuf('cornerRadius', e.target.value);
            const v = e.target.value.trim();
            if (v === "") return;
            const num = Math.round(Number(v));
            if (Number.isFinite(num)) updateLayerTransient(selected.id, { cornerRadius: num as any } as any);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const num = v === "" ? 0 : Math.round(Number(v));
            updateLayer(selected.id, { cornerRadius: num as any } as any);
            clearBuf('cornerRadius');
          }}
        />
      </div>

      <div className="space-y-1 col-span-2">
        <Label>Clip contents</Label>
        <div className="flex items-center gap-2 h-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={(((selected as any).masksToBounds ?? 0) === 1)}
                  disabled={inState}
                  onCheckedChange={(checked) =>
                    updateLayer(selected.id, { masksToBounds: (checked ? 1 : 0) as any } as any)
                  }
                />
              </div>
            </TooltipTrigger>
            {inState && (
              <TooltipContent sideOffset={6}>Not supported for state transitions</TooltipContent>
            )}
          </Tooltip>
          <span className="text-xs text-muted-foreground">Masks this layer's sublayers to its bounds.</span>
        </div>
      </div>
    </div>
  );
}
