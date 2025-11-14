"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InspectorTabProps } from "../types";
import { useEditor } from "../../editor-context";
import { AnyLayer } from "@/lib/ca/types";

export function VideoTab({
  selected,
  updateLayer,
}: Omit<InspectorTabProps, 'getBuf' | 'setBuf' | 'clearBuf' | 'round2' | 'fmt2' | 'fmt0' | 'updateLayerTransient' | 'selectedBase'>) {
  const { updateBatchSpecificStateOverride } = useEditor();
  if (selected.type !== 'video') return null;

  const isSyncWithState = (selected as any).syncWWithState;
  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      <div className="space-y-1 col-span-2">
        <Label>Video Properties</Label>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Frames: {(selected as any).frameCount || 0}</div>
          <div>FPS: {(selected as any).fps || 30}</div>
          <div>Duration: {((selected as any).duration || 0).toFixed(2)}s</div>
        </div>
      </div>
      <div className="space-y-1 col-span-2">
        <Label htmlFor="video-calculation-mode">Calculation Mode</Label>
        <Select
          value={(selected as any).calculationMode || 'linear'}
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
            checked={!!(selected as any).autoReverses}
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
            checked={!!(selected as any).syncWWithState}
            onCheckedChange={(checked) => {
              if (checked) {
                const targetIds: string[] = [];
                const values: number[] = [];
                const children: AnyLayer[] = [];
                for (let i = 0; i < (selected as any).frameCount; i++) {
                  const childId = `${selected.id}_frame_${i}`;
                  targetIds.push(childId);
                  values.push(-i * (i + 1) / 2);
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
                  const zPosition = i * (2 * selected.frameCount - 1 - i) / 2
                  targetIds.push(childId);
                  values.push(zPosition);
                }
                updateBatchSpecificStateOverride(targetIds, 'zPosition', values, 'Locked');
                updateLayer(selected.id, { syncWWithState: checked, children } as any)
              } else {
                updateLayer(selected.id, { syncWWithState: checked, children: undefined } as any)
              }
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, the video will sync with state transitions.
        </p>
      </div>
    </div>
  );
}
