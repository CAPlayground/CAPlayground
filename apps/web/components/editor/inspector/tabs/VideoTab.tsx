"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InspectorTabProps } from "../types";
import { useEditor } from "../../editor-context";
import { AnyLayer, SyncStateFrameMode } from "@/lib/ca/types";
import { useMemo } from "react";

const {
  BEGINNING,
  END
} = SyncStateFrameMode;

const defaultSyncStateFrameMode = {
  Locked: BEGINNING,
  Unlock: END,
  Sleep: BEGINNING
}

export function VideoTab({
  selected,
  updateLayer,
}: Omit<InspectorTabProps, 'getBuf' | 'setBuf' | 'clearBuf' | 'round2' | 'fmt2' | 'fmt0' | 'updateLayerTransient' | 'selectedBase'>) {
  const { updateBatchSpecificStateOverride } = useEditor();
  if (selected.type !== 'video') return null;

  const isSyncWithState = selected.syncWWithState;
  const syncStateFrameMode = selected.syncStateFrameMode

  const modeByState = {
    Locked: syncStateFrameMode?.Locked || defaultSyncStateFrameMode.Locked,
    Unlock: syncStateFrameMode?.Unlock || defaultSyncStateFrameMode.Unlock,
    Sleep: syncStateFrameMode?.Sleep || defaultSyncStateFrameMode.Sleep
  };

  const {
    targetIds,
    initialZValues,
    finalZValues
  } = useMemo(() => {
    const targetIds: string[] = [];
    const initialZValues: number[] = [];
    const finalZValues: number[] = [];
    for (let i = 0; i < selected.frameCount; i++) {
      const childId = `${selected.id}_frame_${i}`;
      const initialZPosition = -i * (i + 1) / 2;
      const finalZPosition = i * (2 * selected.frameCount - 1 - i) / 2;
      targetIds.push(childId);
      initialZValues.push(initialZPosition);
      finalZValues.push(finalZPosition);
    }
    return { targetIds, initialZValues, finalZValues };
  }, [selected.frameCount]);

  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      <div className="space-y-1 col-span-2">
        <Label>Video Properties</Label>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Frames: {selected.frameCount || 0}</div>
          <div>FPS: {selected.fps || 30}</div>
          <div>Duration: {((selected.duration || 0).toFixed(2))}s</div>
        </div>
      </div>
      <div className="space-y-1 col-span-2">
        <Label htmlFor="video-calculation-mode">Calculation Mode</Label>
        <Select
          value={selected.calculationMode || 'linear'}
          onValueChange={(v) => updateLayer(selected.id, { calculationMode: (v as 'linear' | 'discrete') } as any)}
          disabled={isSyncWithState}
        >
          <SelectTrigger id="video-calculation-mode" className="w-full">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear">Linear</SelectItem>
            <SelectItem value="discrete">Discrete</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Linear blends frame values smoothly. Discrete jumps from one frame to the next with no interpolation.
        </p>
      </div>
      <div className="space-y-1 col-span-2">
        <div className="flex items-center justify-between">
          <Label>Auto Reverses</Label>
          <Switch
            checked={!!selected.autoReverses}
            onCheckedChange={(checked) => updateLayer(selected.id, { autoReverses: checked } as any)}
            disabled={isSyncWithState}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, the video will play forward then backward in a loop.
        </p>
      </div>

      <div className="space-y-1 col-span-2">
        <div className="flex items-center justify-between">
          <Label>Sync with state transition</Label>
          <Switch
            checked={!!selected.syncWWithState}
            onCheckedChange={(checked) => {
              if (checked) {
                const children: AnyLayer[] = [];
                for (let i = 0; i < selected.frameCount; i++) {
                  const childId = `${selected.id}_frame_${i}`;
                  children.push({
                    id: childId,
                    name: childId,
                    type: "image",
                    src: `assets/${selected.framePrefix}${i}${selected.frameExtension}`,
                    size: {
                      w: selected.size.w,
                      h: selected.size.h
                    },
                    position: {
                      x: selected.size.w / 2,
                      y: selected.size.h / 2
                    },
                    zPosition: -i * (i + 1) / 2,
                    fit: 'fill',
                    visible: true
                  });
                }
                updateLayer(selected.id, { syncWWithState: checked, children } as any);
                updateBatchSpecificStateOverride(
                  targetIds,
                  'zPosition',
                  {
                    Locked: initialZValues,
                    Unlock: finalZValues,
                    Sleep: initialZValues
                  },
                );
              } else {
                updateLayer(selected.id, { syncWWithState: checked, children: [], syncStateFrameMode: {} } as any)
              }
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, the video will sync with state transitions.
        </p>
        {isSyncWithState && (
          <div className="mt-2 space-y-2">
            {(['Locked', 'Unlock', 'Sleep'] as const).map((stateName) => (
              <div key={stateName} className="flex items-center justify-between gap-2 text-xs">
                <span>{stateName}</span>
                <Select
                  value={modeByState[stateName]}
                  onValueChange={(v) => {
                    const nextModes = {
                      ...(syncStateFrameMode || {}),
                      [stateName]: v as SyncStateFrameMode,
                    };
                    updateBatchSpecificStateOverride(
                      targetIds,
                      'zPosition',
                      { [stateName]: v === BEGINNING ? initialZValues : finalZValues }
                    );
                    updateLayer(selected.id, { syncStateFrameMode: nextModes } as any);
                  }}
                >
                  <SelectTrigger className="w-28 h-7 px-2 py-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BEGINNING}>Beginning</SelectItem>
                    <SelectItem value={END}>End</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
