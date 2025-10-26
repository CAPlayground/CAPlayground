"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InspectorTabProps } from "../types";

interface ReplicatorTabProps extends InspectorTabProps {
  activeState?: string;
}

export function ReplicatorTab({
  selected,
  updateLayer,
  updateLayerTransient,
  activeState,
  getBuf,
  setBuf,
  clearBuf,
  fmt0,
  fmt2,
}: ReplicatorTabProps) {
  if ((selected as any).type !== 'replicator') return null;
  const inState = !!activeState && activeState !== 'Base State';

  const numInput = (
    id: string,
    label: string,
    getVal: () => string,
    toNum: (v: string) => number,
    patch: (v: number) => Partial<any>,
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        type="number"
        step="1"
        disabled={false}
        value={getVal()}
        onChange={(e) => {
          setBuf(id, e.target.value);
          const v = e.target.value.trim();
          if (v === "") return;
          const num = toNum(v);
          if (Number.isFinite(num)) updateLayerTransient(selected.id, patch(num) as any);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
        onBlur={(e) => {
          const v = e.target.value.trim();
          const num = v === "" ? 0 : toNum(v);
          updateLayer(selected.id, patch(num) as any);
          clearBuf(id);
        }}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      {numInput(
        'instanceCount',
        'Instance Count',
        () => getBuf('instanceCount', fmt0((selected as any).instanceCount ?? 1)),
        (v) => Math.max(0, Math.floor(Number(v))),
        (v) => ({ instanceCount: v }),
      )}
      {numInput(
        'instanceDelay',
        'Instance Delay (s)',
        () => getBuf('instanceDelay', fmt2((selected as any).instanceDelay ?? 0)),
        (v) => Number(v),
        (v) => ({ instanceDelay: v }),
      )}
      {numInput(
        'instanceTranslateX',
        'Translate X (px)',
        () => getBuf('instanceTranslateX', fmt2((selected as any).instanceTranslateX ?? 0)),
        (v) => Number(v),
        (v) => ({ instanceTranslateX: v }),
      )}
      {numInput(
        'instanceTranslateY',
        'Translate Y (px)',
        () => getBuf('instanceTranslateY', fmt2((selected as any).instanceTranslateY ?? 0)),
        (v) => Number(v),
        (v) => ({ instanceTranslateY: v }),
      )}
      {numInput(
        'instanceTranslateZ',
        'Translate Z (px)',
        () => getBuf('instanceTranslateZ', fmt2((selected as any).instanceTranslateZ ?? 0)),
        (v) => Number(v),
        (v) => ({ instanceTranslateZ: v }),
      )}
      {numInput(
        'instanceRotateZ',
        'Rotate Z (deg)',
        () => getBuf('instanceRotateZ', fmt2((selected as any).instanceRotateZ ?? 0)),
        (v) => Number(v),
        (v) => ({ instanceRotateZ: v }),
      )}
    </div>
  );
}
