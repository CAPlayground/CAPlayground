"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import type { InspectorTabProps } from "../types";
import type { Animation, AnyLayer, KeyPath, Size, Vec2 } from "@/lib/ca/types";
import { BulkAnimationInput } from "./BulkAnimationInput";
import { useEditor } from "../../editor-context";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

const supportedAnimations = [
  "position",
  "position.x",
  "position.y",
  "transform.rotation.x",
  "transform.rotation.y",
  "transform.rotation.z",
  "opacity",
  "bounds",
]

export function AnimationsTab({
  selectedBase,
  updateLayer,
  getBuf,
  setBuf,
  clearBuf,
}: InspectorTabProps) {
  const addAnimation = (keyPath: KeyPath) => {
    const current = selectedBase?.animations || [];
    updateLayer(
      selectedBase!.id,
      {
        animations: [
          ...current,
          {
            keyPath,
            enabled: true,
            values: [],
            durationSeconds: 1,
            speed: 1,            
          }]
      });
  };

  return (
    <div className="space-y-2">
      <Select
        value={''}
        onValueChange={addAnimation}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Add animation" />
        </SelectTrigger>
        <SelectContent>
          {supportedAnimations
            .filter((kp) => !selectedBase?.animations?.some((a) => a.keyPath === kp))
            .map((kp) => (
              <SelectItem key={kp} value={kp}>
                {kp}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Accordion
        type="multiple"
      >
        {selectedBase?.animations?.map((animation, index) => (
          <AccordionItem key={animation.keyPath} value={animation.keyPath!!}>
            <AnimationItem
              key={animation.keyPath}
              animation={animation}
              selectedBase={selectedBase}
              getBuf={getBuf}
              setBuf={setBuf}
              clearBuf={clearBuf}
              index={index}
            />
          </AccordionItem>
        ))}
      </Accordion>

    </div>
  );
}

interface AnimationsItemProps {
  selectedBase: AnyLayer;
  index: number;
  animation: Animation;
  getBuf: (key: string, fallback: string) => string;
  setBuf: (key: string, val: string) => void;
  clearBuf: (key: string) => void;
}

const AnimationItem = ({
  animation,
  selectedBase,
  index,
  getBuf,
  setBuf,
  clearBuf,
}: AnimationsItemProps) => {
  const {
    enabled,
    keyPath,
    autoreverses,
    durationSeconds,
    speed,
    repeatDurationSeconds,
    infinite,
    values = [],
  } = animation;
  const { updateLayer } = useEditor();

  const updateAnimation = (updates: Partial<Animation>) => {
    const current = selectedBase?.animations || [];
    const newAnim = [...current];
    newAnim[index] = { ...animation, ...updates };
    updateLayer(selectedBase!.id, { animations: newAnim });
  };

  return (
    <div>
      <div className="flex w-full items-center gap-2">
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => updateAnimation({ enabled: !!checked })}
          title="Enable animation"
        />
        <AccordionTrigger className="w-full">
          {keyPath}
        </AccordionTrigger>
      </div>
      <AccordionContent>
        <div className={`grid grid-cols-2 gap-2 ${enabled ? '' : 'opacity-50'}`}>
          <div className="flex justify-between space-y-1 col-span-2">
            <Label>Autoreverse</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={(autoreverses ?? 0) === 1}
                onCheckedChange={(checked) => updateAnimation({ autoreverses: checked ? 1 : 0 })}
                disabled={!enabled}
              />
              <span className="text-xs text-muted-foreground">Reverse on repeat</span>
            </div>
          </div>
          <div className="space-y-1 col-span-1">
            <Label htmlFor="anim-duration">Duration (s)</Label>
            <Input
              id="anim-duration"
              type="number"
              step="0.01"
              min="0"
              className="h-8"
              value={getBuf('anim-duration', (() => { const d = Number(durationSeconds); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
              onChange={(e) => setBuf('anim-duration', e.target.value)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const n = v === '' ? 1 : Number(v);
                const durationSeconds = Number.isFinite(n) && n > 0 ? n : 1;
                updateAnimation({ durationSeconds });
                clearBuf('anim-duration');
              }}
              disabled={!enabled}
            />
          </div>
          <div className="space-y-1 col-span-1">
            <Label htmlFor="anim-speed">Speed</Label>
            <Input
              id="anim-speed"
              type="number"
              step="0.01"
              min="0"
              className="h-8"
              value={getBuf('anim-speed', (() => { const d = Number(speed); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
              onChange={(e) => setBuf('anim-speed', e.target.value)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const n = v === '' ? 1 : Number(v);
                const speed = Number.isFinite(n) && n > 0 ? n : 1;
                updateAnimation({ speed });
                clearBuf('anim-speed');
              }}
              disabled={!enabled}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Loop infinitely</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={(infinite ?? 1) === 1}
                onCheckedChange={(checked) => updateAnimation({ infinite: checked ? 1 : 0 })}
                disabled={!enabled}
              />
              <span className="text-xs text-muted-foreground">When off, specify total repeat time.</span>
            </div>
          </div>
          {((infinite ?? 1) !== 1) && (
            <div className="space-y-1 col-span-2 mb-2">
              <Label htmlFor="anim-repeat">Repeat for (s)</Label>
              <Input
                id="anim-repeat"
                type="number"
                step="0.01"
                min="0"
                className="h-8"
                value={getBuf('anim-repeat', (() => { const d = Number(repeatDurationSeconds); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
                onChange={(e) => setBuf('anim-repeat', e.target.value)}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const n = v === '' ? Number(durationSeconds) || 1 : Number(v);
                  const total = Number.isFinite(n) && n > 0 ? n : (Number(durationSeconds) || 1);
                  updateAnimation({ repeatDurationSeconds: total });
                  clearBuf('anim-repeat');
                }}
                disabled={!enabled}
              />
            </div>
          )}
        </div>

        <div className="space-y-2 mb-2">
          <div className="grid grid-cols-2 gap-x-2 space-y-1">
            <Label>
              {(() => {
                if (keyPath.startsWith('transform.rotation')) return 'Values (Degrees)';
                if (keyPath === 'position') return 'Values (CGPoint)';
                if (keyPath === 'opacity') return 'Values (Percentage)';
                if (keyPath === 'bounds') return 'Values (CGRect)';
                return 'Values (Number)';
              })()}
            </Label>
            <div className="col-span-2 text-xs text-muted-foreground">
              {(() => {
                if (keyPath.startsWith('transform.rotation')) return 'Animation values in degrees for rotation.';
                if (keyPath === 'position') return 'Animation values as x, y coordinates.';
                if (keyPath === 'opacity') return 'Animation values as opacity percentages.';
                if (keyPath === 'bounds') return 'Animation values as width, height dimensions.';
                return 'Animation values as numbers.';
              })()}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const values = [...(animation.values || [])];
                if (keyPath === 'position') {
                  values.push({ x: selectedBase.position?.x ?? 0, y: selectedBase.position?.y ?? 0 });
                } else if (keyPath === 'position.x') {
                  values.push(selectedBase.position?.x ?? 0);
                } else if (keyPath === 'position.y') {
                  values.push(selectedBase.position?.y ?? 0);
                } else if (keyPath === 'transform.rotation.z') {
                  values.push(Number(selectedBase?.rotation ?? 0));
                } else if (keyPath === 'transform.rotation.x' || keyPath === 'transform.rotation.y') {
                  values.push(0);
                } else if (keyPath === 'opacity') {
                  values.push(Number(selectedBase?.opacity ?? 1));
                } else if (keyPath === 'bounds') {
                  values.push({ w: selectedBase.size?.w ?? 0, h: selectedBase.size?.h ?? 0 });
                }
                updateAnimation({ values });
              }}
              disabled={!enabled}
              className="col-span-1"
            >
              + Add key value
            </Button>
            <div className="flex col-span-1">
              <BulkAnimationInput
                keyPath={keyPath as KeyPath}
                currentValues={values}
                onValuesChange={(values) => updateAnimation({ values })}
                disabled={!enabled}
              />
            </div>
          </div>
          <div className={`space-y-2 ${enabled ? '' : 'opacity-50'}`}>
            {values?.map((val, idx) => {
              const isTwoValue = keyPath === 'position' || keyPath === 'bounds';
              const isPosition = keyPath === 'position';
              const isOpacity = keyPath === 'opacity';
              return (
                <div key={idx} className={`grid ${isTwoValue ? 'grid-cols-3' : 'grid-cols-2'} gap-2 items-end`}>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {isTwoValue
                        ? (isPosition ? 'X' : 'Width')
                        : (keyPath === 'position.x' ? 'X' : keyPath === 'position.y' ? 'Y' : isOpacity ? 'Opacity' : 'Degrees')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        className="h-8"
                        value={
                          isTwoValue
                            ? (isPosition
                              ? (Number.isFinite((val as Vec2)?.x) ? String(Math.round((val as Vec2).x)) : '')
                              : (Number.isFinite((val as Size)?.w) ? String(Math.round((val as Size).w)) : ''))
                            : (isOpacity
                              ? String(Math.round((typeof val === 'number' ? val : 1) * 100))
                              : (Number.isFinite(Number(val)) ? String(Math.round(Number(val))) : ''))
                        }
                        onChange={(e) => {
                          const arr = [...values];
                          const n = Number(e.target.value);
                          if (isTwoValue) {
                            if (isPosition) {
                              arr[idx] = { x: Number.isFinite(n) ? n : 0, y: (arr[idx] as Vec2)?.y ?? 0 };
                            } else {
                              arr[idx] = { w: Number.isFinite(n) ? n : 0, h: (arr[idx] as Size)?.h ?? 0 };
                            }
                          } else if (isOpacity) {
                            const p = Math.max(0, Math.min(100, Math.round(n)));
                            arr[idx] = Math.round(p) / 100;
                          } else {
                            arr[idx] = Number.isFinite(n) ? n : 0;
                          }
                          updateAnimation({ values: arr });
                        }}
                        disabled={!enabled}
                      />
                      {!isTwoValue && isOpacity && <span className="text-xs text-muted-foreground">%</span>}
                    </div>
                  </div>
                  {isTwoValue && (
                    <div className="space-y-1">
                      <Label className="text-xs">{isPosition ? 'Y' : 'Height'}</Label>
                      <Input
                        type="number"
                        step="1"
                        className="h-8"
                        value={
                          isPosition
                            ? (Number.isFinite((val as Vec2)?.y) ? String(Math.round((val as Vec2).y)) : '')
                            : (Number.isFinite((val as Size)?.h) ? String(Math.round((val as Size).h)) : '')
                        }
                        onChange={(e) => {
                          const arr = [...values];
                          const n = Number(e.target.value);
                          if (isPosition) {
                            arr[idx] = { x: (arr[idx] as Vec2)?.x ?? 0, y: Number.isFinite(n) ? n : 0 };
                          } else {
                            arr[idx] = { w: (arr[idx] as Size)?.w ?? 0, h: Number.isFinite(n) ? n : 0 };
                          }
                          updateAnimation({ values: arr });
                        }}
                        disabled={!enabled}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-end pb-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const arr = [...values];
                        arr.splice(idx, 1);
                        updateAnimation({ values: arr });
                      }}
                      disabled={!enabled}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
            {values.length === 0 && (
              <div className="text-xs text-muted-foreground">No key values yet. Click "+ Add key value" to add the first keyframe.</div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {enabled && values.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const textValues = values.map(val => {
                  if (typeof val === 'number') {
                    return keyPath === 'opacity' ? Math.round(val * 100).toString() : Math.round(val).toString();
                  } else if ('x' in val) {
                    return `${Math.round(val.x)}, ${Math.round(val.y)}`;
                  } else if ('w' in val) {
                    return `${Math.round(val.w)}, ${Math.round(val.h)}`;
                  }
                  return '';
                }).join('\n');

                const blob = new Blob([textValues], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `animation-values-${keyPath}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              disabled={!enabled}
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              Export Values
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => {
              const animations = [...(selectedBase?.animations || [])];
              animations.splice(index, 1);
              updateLayer(selectedBase?.id, { animations });
            }}
          >
            Remove Animation
          </Button>
        </div>
      </AccordionContent>
    </div>
  );
}