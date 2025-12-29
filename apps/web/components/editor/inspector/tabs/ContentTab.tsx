"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { InspectorTabProps } from "../types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { TabId } from "../types";

interface ContentTabProps extends InspectorTabProps {
  setActiveTab: (tab: TabId) => void;
  activeState?: string;
}

export function ContentTab({
  selected,
  updateLayer,
  updateLayerTransient,
  getBuf,
  setBuf,
  clearBuf,
  round2,
  fmt2,
  setActiveTab,
  activeState,
}: ContentTabProps) {
  const inState = !!activeState && activeState !== 'Base State';
  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      {selected.type !== 'gradient' && (
        <>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="backgroundColor">背景颜色</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
            <Input
              id="backgroundColor"
              type="color"
              className="w-full h-8"
              value={(selected as any).backgroundColor ?? "#ffffff"}
              disabled={inState}
              onChange={(e) => updateLayer(selected.id, { backgroundColor: e.target.value } as any)}
            />
                </div>
              </TooltipTrigger>
              {inState && <TooltipContent sideOffset={6}>状态转换不支持</TooltipContent>}
            </Tooltip>
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="backgroundOpacity">背景不透明度</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={inState ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex items-center gap-2 w-full">
              <Slider
                id="backgroundOpacity"
                value={[Math.round((((selected as any).backgroundOpacity ?? 1) * 100))]}
                min={0}
                max={100}
                step={1}
                disabled={inState}
                onValueChange={([p]) => {
                  const clamped = Math.max(0, Math.min(100, Math.round(Number(p))));
                  const val = Math.round((clamped / 100) * 100) / 100; // 2 d.p.
                  updateLayerTransient(selected.id, { backgroundOpacity: val as any } as any);
                }}
              />
              <Input
                id="backgroundOpacityPct"
                className="w-24 h-8 text-right"
                type="number"
                min={0}
                max={100}
                step={1}
                disabled={inState}
                value={getBuf('backgroundOpacityPct', String(Math.round((((selected as any).backgroundOpacity ?? 1) * 100))))}
                onChange={(e) => {
                  setBuf('backgroundOpacityPct', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const p = Math.max(0, Math.min(100, Math.round(Number(v))));
                  const val = Math.round((p / 100) * 100) / 100;
                  updateLayerTransient(selected.id, { backgroundOpacity: val as any } as any);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const p = v === "" ? undefined : Math.max(0, Math.min(100, Math.round(Number(v))));
                  const val = typeof p === 'number' ? Math.round((p / 100) * 100) / 100 : undefined;
                  updateLayer(selected.id, { backgroundOpacity: (typeof val === 'number') ? val as any : (undefined as any) } as any);
                  clearBuf('backgroundOpacityPct');
                }}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
                </div>
              </TooltipTrigger>
              {inState && <TooltipContent sideOffset={6}>状态转换不支持</TooltipContent>}
            </Tooltip>
            <div className="col-span-2 -mt-1">
              <p className="text-[11px] text-muted-foreground">
                背景不透明度仅影响此图层的背景颜色填充（内容后面）。对于整体图层不透明度
                （影响图像、文本和子图层），请使用
                {' '}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setActiveTab('compositing')}
                >
                  合成 → 不透明度
                </button>.
              </p>
            </div>
          </div>
        </>
      )}
      <div className="space-y-1">
        <Label htmlFor="borderColor">边框颜色</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
        <Input
          id="borderColor"
          type="color"
          value={(selected as any).borderColor ?? "#000000"}
          disabled={inState}
          onChange={(e) => updateLayer(selected.id, { borderColor: e.target.value } as any)}
        />
            </div>
          </TooltipTrigger>
          {inState && <TooltipContent sideOffset={6}>状态转换不支持</TooltipContent>}
        </Tooltip>
      </div>
      <div className="space-y-1">
        <Label htmlFor="borderWidth">边框宽度</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
        <Input
          id="borderWidth"
          type="number"
          step={0.01}
          value={getBuf('borderWidth', fmt2((selected as any).borderWidth))}
          disabled={inState}
          onChange={(e) => {
            setBuf('borderWidth', e.target.value);
            const v = e.target.value.trim();
            if (v === "") return;
            const num = round2(Number(v));
            if (Number.isFinite(num)) updateLayerTransient(selected.id, { borderWidth: Math.max(0, num) } as any);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const num = v === "" ? undefined : round2(Number(v));
            updateLayer(selected.id, { borderWidth: (typeof num === 'number' && Number.isFinite(num)) ? Math.max(0, num) : (undefined as any) } as any);
            clearBuf('borderWidth');
          }}
        />
            </div>
          </TooltipTrigger>
          {inState && <TooltipContent sideOffset={6}>状态转换不支持</TooltipContent>}
        </Tooltip>
      </div>
    </div>
  );
}
