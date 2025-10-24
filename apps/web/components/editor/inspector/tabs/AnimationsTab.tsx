"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { InspectorTabProps } from "../types";
import type { KeyPath } from "@/lib/ca/types";

interface AnimationsTabProps extends InspectorTabProps {
  animEnabled: boolean;
  activeState?: string;
}

export function AnimationsTab({
  selected,
  selectedBase,
  updateLayer,
  getBuf,
  setBuf,
  clearBuf,
  animEnabled,
  activeState,
}: AnimationsTabProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Enable animation</Label>
        {(selectedBase as any)?.type === 'video' && (
          <span className="text-xs text-muted-foreground mr-auto ml-2">
            Note: Animations are not supported for video layers.
          </span>
        )}
        {activeState && activeState !== 'Base State' ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={(selectedBase as any)?.type === 'video' ? false : !!(selectedBase as any)?.animations?.enabled}
                  disabled={(selectedBase as any)?.type === 'video'}
                  onCheckedChange={(checked) => {
                    if ((selectedBase as any)?.type === 'video') return;
                    const enabled = !!checked;
                    const currentAnim = (selectedBase as any)?.animations || {};
                    const kp = (currentAnim.keyPath ?? 'position') as KeyPath;
                    let values: Array<{ x: number; y: number } | { w: number; h: number } | number> = Array.isArray(currentAnim.values) ? [...currentAnim.values] : [];
                    if (enabled && values.length === 0) {
                      if (kp === 'position') {
                        values = [{ x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 }];
                      } else if (kp === 'position.x') {
                        values = [((selectedBase as any).position?.x ?? 0) as number];
                      } else if (kp === 'position.y') {
                        values = [((selectedBase as any).position?.y ?? 0) as number];
                      } else if (kp === 'transform.rotation.z') {
                        values = [Number((selectedBase as any)?.rotation ?? 0)];
                      } else if (kp === 'opacity') {
                        values = [Number((selectedBase as any)?.opacity ?? 1)];
                      } else if (kp === 'bounds') {
                        values = [{ w: (selectedBase as any).size?.w ?? 0, h: (selectedBase as any).size?.h ?? 0 }];
                      } else {
                        values = [0];
                      }
                    }
                    updateLayer(selectedBase!.id, { animations: { ...currentAnim, enabled, keyPath: kp, autoreverses: (currentAnim.autoreverses ?? 0), values, infinite: (currentAnim.infinite ?? 1) } } as any);
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              You must be on the Base State to create animations.
            </TooltipContent>
          </Tooltip>
        ) : (
          <Switch
            checked={(selectedBase as any)?.type === 'video' ? false : !!(selectedBase as any)?.animations?.enabled}
            disabled={(selectedBase as any)?.type === 'video'}
            onCheckedChange={(checked) => {
              if ((selectedBase as any)?.type === 'video') return;
              const enabled = !!checked;
              const currentAnim = (selectedBase as any)?.animations || {};
              const kp = (currentAnim.keyPath ?? 'position') as KeyPath;
              let values: Array<{ x: number; y: number } | { w: number; h: number } | number> = Array.isArray(currentAnim.values) ? [...currentAnim.values] : [];
              if (enabled && values.length === 0) {
                if (kp === 'position') {
                  values = [{ x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 }];
                } else if (kp === 'position.x') {
                  values = [((selectedBase as any).position?.x ?? 0) as number];
                } else if (kp === 'position.y') {
                  values = [((selectedBase as any).position?.y ?? 0) as number];
                } else if (kp === 'transform.rotation.z') {
                  values = [Number((selectedBase as any)?.rotation ?? 0)];
                } else if (kp === 'opacity') {
                  values = [Number((selectedBase as any)?.opacity ?? 1)];
                } else if (kp === 'bounds') {
                  values = [{ w: (selectedBase as any).size?.w ?? 0, h: (selectedBase as any).size?.h ?? 0 }];
                } else {
                  values = [0];
                }
              }
              updateLayer(selectedBase!.id, { animations: { ...currentAnim, enabled, keyPath: kp, autoreverses: (currentAnim.autoreverses ?? 0), values, infinite: (currentAnim.infinite ?? 1) } } as any);
            }}
          />
        )}
      </div>
      <div className={`grid grid-cols-2 gap-2 ${animEnabled ? '' : 'opacity-50'}`}>
        <div className="space-y-1">
          <Label>Key path</Label>
          <Select
            value={((selectedBase as any)?.animations?.keyPath ?? 'position') as any}
            onValueChange={(v) => {
              const current = (selectedBase as any)?.animations || {};
              const kp = v as KeyPath;
              const prevVals = (current.values || []) as Array<{ x: number; y: number } | number>;
              let values: Array<{ x: number; y: number } | { w: number; h: number } | number> = [];
              if (kp === 'position') {
                values = prevVals.map((pv: any) => {
                  if (typeof pv === 'number') {
                    return { x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 };
                  }
                  return { x: Number(pv?.x ?? 0), y: Number(pv?.y ?? 0) };
                });
              } else if (kp === 'position.x') {
                values = prevVals.map((pv: any) => typeof pv === 'number' ? pv : Number(pv?.x ?? (selectedBase as any).position?.x ?? 0));
              } else if (kp === 'position.y') {
                values = prevVals.map((pv: any) => typeof pv === 'number' ? pv : Number(pv?.y ?? (selectedBase as any).position?.y ?? 0));
              } else if (kp === 'transform.rotation.z' || kp === 'transform.rotation.x' || kp === 'transform.rotation.y') {
                const fallback = (kp === 'transform.rotation.z') ? Number((selectedBase as any)?.rotation ?? 0) : 0;
                values = prevVals.map((pv: any) => typeof pv === 'number' ? pv : fallback);
              } else if (kp === 'opacity') {
                values = prevVals.map((pv: any) => Number((selectedBase as any)?.opacity ?? 1));
              } else if (kp === 'bounds') {
                values = prevVals.map((pv: any) => {
                  return { w: (selectedBase as any).size?.w ?? 0, h: (selectedBase as any).size?.h ?? 0 };
                });
              }
              updateLayer(selectedBase!.id, { animations: { ...current, keyPath: kp, values } } as any);
            }}
            disabled={!animEnabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select key path" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="position">position</SelectItem>
              <SelectItem value="position.x">position.x</SelectItem>
              <SelectItem value="position.y">position.y</SelectItem>
              <SelectItem value="transform.rotation.x">transform.rotation.x</SelectItem>
              <SelectItem value="transform.rotation.y">transform.rotation.y</SelectItem>
              <SelectItem value="transform.rotation.z">transform.rotation.z</SelectItem>
              <SelectItem value="opacity">opacity</SelectItem>
              <SelectItem value="bounds">bounds</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Autoreverse</Label>
          <div className="flex items-center gap-2 h-8">
            <Switch
              checked={((selectedBase as any)?.animations?.autoreverses ?? 0) === 1}
              onCheckedChange={(checked) => {
                const current = (selectedBase as any)?.animations || {};
                updateLayer(selectedBase!.id, { animations: { ...current, autoreverses: checked ? 1 : 0 } } as any);
              }}
              disabled={!animEnabled}
            />
            <span className="text-xs text-muted-foreground">Reverse on repeat</span>
          </div>
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="anim-duration">Duration (s)</Label>
          <Input
            id="anim-duration"
            type="number"
            step="0.01"
            min="0"
            className="h-8"
            value={getBuf('anim-duration', (() => { const d = Number((selectedBase as any)?.animations?.durationSeconds); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
            onChange={(e) => setBuf('anim-duration', e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const current = (selectedBase as any)?.animations || {};
              const n = v === '' ? 1 : Number(v);
              const dur = Number.isFinite(n) && n > 0 ? n : 1;
              updateLayer(selectedBase!.id, { animations: { ...current, durationSeconds: dur } } as any);
              clearBuf('anim-duration');
            }}
            disabled={!animEnabled}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="anim-speed">Speed</Label>
          <Input
            id="anim-speed"
            type="number"
            step="0.01"
            min="0"
            className="h-8"
            value={getBuf('anim-speed', (() => { const d = Number((selectedBase as any)?.animations?.speed); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
            onChange={(e) => setBuf('anim-speed', e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const current = (selectedBase as any)?.animations || {};
              const n = v === '' ? 1 : Number(v);
              const dur = Number.isFinite(n) && n > 0 ? n : 1;
              updateLayer(selectedBase!.id, { animations: { ...current, speed: dur } } as any);
              clearBuf('anim-speed');
            }}
            disabled={!animEnabled}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Loop infinitely</Label>
          <div className="flex items-center gap-2 h-8">
            <Switch
              checked={(((selectedBase as any)?.animations?.infinite ?? 1) as number) === 1}
              onCheckedChange={(checked) => {
                const current = (selectedBase as any)?.animations || {};
                updateLayer(selectedBase!.id, { animations: { ...current, infinite: checked ? 1 : 0 } } as any);
              }}
              disabled={!animEnabled}
            />
            <span className="text-xs text-muted-foreground">When off, specify total repeat time.</span>
          </div>
        </div>
        {(((selectedBase as any)?.animations?.infinite ?? 1) as number) !== 1 && (
          <div className="space-y-1 col-span-2">
            <Label htmlFor="anim-repeat">Repeat for (s)</Label>
            <Input
              id="anim-repeat"
              type="number"
              step="0.01"
              min="0"
              className="h-8"
              value={getBuf('anim-repeat', (() => { const d = Number((selectedBase as any)?.animations?.repeatDurationSeconds); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
              onChange={(e) => setBuf('anim-repeat', e.target.value)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const current = (selectedBase as any)?.animations || {};
                const n = v === '' ? Number((selectedBase as any)?.animations?.durationSeconds) || 1 : Number(v);
                const total = Number.isFinite(n) && n > 0 ? n : (Number((selectedBase as any)?.animations?.durationSeconds) || 1);
                updateLayer(selectedBase!.id, { animations: { ...current, repeatDurationSeconds: total } } as any);
                clearBuf('anim-repeat');
              }}
              disabled={!animEnabled}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            {(() => {
              const kp = ((selectedBase as any)?.animations?.keyPath ?? 'position') as KeyPath;
              if (kp.startsWith('transform.rotation')) return 'Values (Degrees)';
              if (kp === 'position') return 'Values (CGPoint)';
              if (kp === 'opacity') return 'Values (Percentage)';
              if (kp === 'bounds') return 'Values (CGRect)';
              return 'Values (Number)';
            })()}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const current = (selectedBase as any)?.animations || {};
              const kp = (current.keyPath ?? 'position') as KeyPath;
              const values = [...(current.values || [])] as any[];
              if (kp === 'position') {
                values.push({ x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 });
              } else if (kp === 'position.x') {
                values.push((selectedBase as any).position?.x ?? 0);
              } else if (kp === 'position.y') {
                values.push((selectedBase as any).position?.y ?? 0);
              } else if (kp === 'transform.rotation.z') {
                values.push(Number((selectedBase as any)?.rotation ?? 0));
              } else if (kp === 'transform.rotation.x' || kp === 'transform.rotation.y') {
                values.push(0);
              } else if (kp === 'opacity') {
                values.push(Number((selectedBase as any)?.opacity ?? 1));
              } else if (kp === 'bounds') {
                values.push({ w: (selectedBase as any).size?.w ?? 0, h: (selectedBase as any).size?.h ?? 0 });
              }
              updateLayer(selectedBase!.id, { animations: { ...current, values } } as any);
            }}
            disabled={!animEnabled}
          >
            + Add key value
          </Button>
        </div>
        <div className={`space-y-2 ${animEnabled ? '' : 'opacity-50'}`}>
          {(() => {
            const kp = ((selectedBase as any)?.animations?.keyPath ?? 'position') as KeyPath;
            const values = (((selectedBase as any)?.animations?.values || []) as Array<any>);
            if (kp === 'position' || kp === 'bounds') {
              return (
                <>
                  {values.map((pt, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">{kp === 'position' ? 'X' : 'Width'}</Label>
                        <Input
                          type="number"
                          step="1"
                          className="h-8"
                          value={kp === 'position'
                            ? Number.isFinite(pt?.x) ? String(Math.round(pt.x)) : ''
                            : Number.isFinite(pt?.w) ? String(Math.round(pt.w)) : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            const current = (selectedBase as any)?.animations || {};
                            const arr = [...(current.values || [])];
                            const n = Number(v);
                            if (kp === 'position') {
                              arr[idx] = { x: Number.isFinite(n) ? n : 0, y: arr[idx]?.y ?? 0 };
                            } else {
                              arr[idx] = { w: Number.isFinite(n) ? n : 0, h: arr[idx]?.h ?? 0 };
                            }
                            updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                          }}
                          disabled={!animEnabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{kp === 'position' ? 'Y' : 'Height'}</Label>
                        <Input
                          type="number"
                          step="1"
                          className="h-8"
                          value={kp === 'position'
                            ? Number.isFinite(pt?.y) ? String(Math.round(pt.y)) : ''
                            : Number.isFinite(pt?.h) ? String(Math.round(pt.h)) : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            const current = (selectedBase as any)?.animations || {};
                            const arr = [...(current.values || [])];
                            const n = Number(v);
                            if (kp === 'position') {
                              arr[idx] = { x: arr[idx]?.x ?? 0, y: Number.isFinite(n) ? n : 0 };
                            } else {
                              arr[idx] = { w: arr[idx]?.w ?? 0, h: Number.isFinite(n) ? n : 0 };
                            }
                            updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                          }}
                          disabled={!animEnabled}
                        />
                      </div>
                      <div className="flex items-center justify-end pb-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const current = (selectedBase as any)?.animations || {};
                            const arr = [...(current.values || [])];
                            arr.splice(idx, 1);
                            updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                          }}
                          disabled={!animEnabled}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              );
            }
            return (
              <>
                {values.map((val, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {kp === 'position.x' ? 'X' : kp === 'position.y' ? 'Y' : kp === 'opacity' ? 'Opacity' : 'Degrees'}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="1"
                          className="h-8"
                          value={kp === 'opacity' ? String(Math.round((typeof val === 'number' ? val : 1) * 100)) : Number.isFinite(Number(val)) ? String(Math.round(Number(val))) : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            const current = (selectedBase as any)?.animations || {};
                            const arr = [...(current.values || [])];
                            const n = Number(v);
                            if (kp === 'opacity') {
                              const p = Math.max(0, Math.min(100, Math.round(n)));
                              const val = Math.round(p) / 100;
                              arr[idx] = val;
                            } else {
                              arr[idx] = Number.isFinite(n) ? n : 0;
                            }
                            updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                          }}
                          disabled={!animEnabled}
                        />
                        {kp === 'opacity' && <span className="text-xs text-muted-foreground">%</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end pb-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const current = (selectedBase as any)?.animations || {};
                          const arr = [...(current.values || [])];
                          arr.splice(idx, 1);
                          updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                        }}
                        disabled={!animEnabled}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
          {(((selectedBase as any)?.animations?.values || []) as any[]).length === 0 && (
            <div className="text-xs text-muted-foreground">No key values yet. Click "+ Add key value" to add the first keyframe.</div>
          )}
        </div>
      </div>
    </div>
  );
}
