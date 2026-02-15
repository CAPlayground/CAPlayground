"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronRight, Download, X } from "lucide-react";
import type { InspectorTabProps } from "../types";
import type { Animation, AnyLayer, KeyPath, Size, Vec2, CalculationMode, TimingFunction } from "@/lib/ca/types";
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
  selected,
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
            infinite: 1,
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
              selected={selected}
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
  selected: AnyLayer;
  selectedBase: AnyLayer;
  index: number;
  animation: Animation;
  getBuf: (key: string, fallback: string) => string;
  setBuf: (key: string, val: string) => void;
  clearBuf: (key: string) => void;
}

const AnimationItem = ({
  animation,
  selected,
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
    keyTimes = [],
    calculationMode = 'linear',
    timingFunction = 'linear',
  } = animation;
  const { updateLayer } = useEditor();
  const [useCustomKeyTimes, setUseCustomKeyTimes] = useState(() => keyTimes.length > 0);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        <div className={`space-y-3 ${enabled ? '' : 'opacity-50'}`}>
          <div className="grid grid-cols-2 gap-2">
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
              <Label>Loop</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch
                  checked={(infinite ?? 1) === 1}
                  onCheckedChange={(checked) => updateAnimation({ infinite: checked ? 1 : 0 })}
                  disabled={!enabled}
                />
                <span className="text-xs text-muted-foreground">Infinite</span>
              </div>
            </div>
            {((infinite ?? 1) !== 1) && (
              <div className="space-y-1 col-span-2">
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

          <div className="border-t border-border/40 pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              disabled={!enabled}
            >
              {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-2 mt-2">
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
                <div className="space-y-1 col-span-1">
                  <Label>Autoreverse</Label>
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={(autoreverses ?? 0) === 1}
                      onCheckedChange={(checked) => updateAnimation({ autoreverses: checked ? 1 : 0 })}
                      disabled={!enabled}
                    />
                  </div>
                </div>
                <div className="space-y-1 col-span-1">
                  <Label>Calculation Mode</Label>
                  <Select
                    value={calculationMode}
                    onValueChange={(value: CalculationMode) => updateAnimation({ calculationMode: value })}
                    disabled={!enabled}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="discrete">Discrete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end space-y-1 col-span-1">
                  <Label>Timing Function</Label>
                  <Select
                    value={timingFunction}
                    onValueChange={(value: TimingFunction) => updateAnimation({ timingFunction: value })}
                    disabled={!enabled}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="easeIn">Ease In</SelectItem>
                      <SelectItem value="easeOut">Ease Out</SelectItem>
                      <SelectItem value="easeInEaseOut">Ease In-Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Custom Key Times</Label>
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={useCustomKeyTimes}
                      onCheckedChange={(checked) => {
                        setUseCustomKeyTimes(checked);
                        if (checked) {
                          const numValues = values.length;
                          const newKeyTimes = values.map((_, idx) =>
                            numValues > 1 ? idx / (numValues - 1) : 0
                          );
                          updateAnimation({ keyTimes: newKeyTimes });
                        } else {
                          updateAnimation({ keyTimes: undefined });
                        }
                      }}
                      disabled={!enabled}
                    />
                    <span className="text-xs text-muted-foreground">Custom timing per keyframe</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-2 mt-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">Keyframes</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const newValues = [...(animation.values || [])];
                  if (keyPath === 'position') {
                    newValues.push({ x: selected.position?.x ?? 0, y: selected.position?.y ?? 0 });
                  } else if (keyPath === 'position.x') {
                    newValues.push(selected.position?.x ?? 0);
                  } else if (keyPath === 'position.y') {
                    newValues.push(selected.position?.y ?? 0);
                  } else if (keyPath === 'transform.rotation.z') {
                    newValues.push(Number(selected?.rotation ?? 0));
                  } else if (keyPath === 'transform.rotation.x' || keyPath === 'transform.rotation.y') {
                    if (keyPath === 'transform.rotation.x') {
                      newValues.push(Number((selected as any).rotationX ?? 0));
                    } else {
                      newValues.push(Number((selected as any).rotationY ?? 0));
                    }
                  } else if (keyPath === 'opacity') {
                    newValues.push(Number(selected?.opacity ?? 1));
                  } else if (keyPath === 'bounds') {
                    newValues.push({ w: selected.size?.w ?? 0, h: selected.size?.h ?? 0 });
                  }
                  if (useCustomKeyTimes) {
                    const newKeyTimes = [...(animation.keyTimes || [])];
                    const defaultKeyTime = newValues.length <= 1 ? 0 : 1;
                    newKeyTimes.push(defaultKeyTime);
                    updateAnimation({ values: newValues, keyTimes: newKeyTimes });
                  } else {
                    updateAnimation({ values: newValues });
                  }
                }}
                disabled={!enabled}
                className="h-7 px-2 text-xs"
              >
                + Add
              </Button>
              <BulkAnimationInput
                keyPath={keyPath as KeyPath}
                currentValues={values}
                onValuesChange={(values) => updateAnimation({ values })}
                disabled={!enabled}
              />
            </div>
          </div>

          {values.length > 0 ? (
            <div className={`border border-border/40 rounded-lg overflow-hidden ${enabled ? '' : 'opacity-50'}`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="pl-2 py-1.5 text-left font-medium text-muted-foreground w-6">#</th>
                    {(() => {
                      const isTwoValue = keyPath === 'position' || keyPath === 'bounds';
                      const isPosition = keyPath === 'position';
                      const isOpacity = keyPath === 'opacity';
                      if (isTwoValue) {
                        return (
                          <>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{isPosition ? 'X' : 'W'}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{isPosition ? 'Y' : 'H'}</th>
                          </>
                        );
                      }
                      return (
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                          {keyPath === 'position.x' ? 'X' : keyPath === 'position.y' ? 'Y' : isOpacity ? 'Opacity' : 'Deg'}
                        </th>
                      );
                    })()}
                    {useCustomKeyTimes && <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-14">Time</th>}
                    <th className="px-1 py-1.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {values.map((val, idx) => {
                    const isTwoValue = keyPath === 'position' || keyPath === 'bounds';
                    const isPosition = keyPath === 'position';
                    const isOpacity = keyPath === 'opacity';
                    const currentKeyTime = keyTimes[idx] ?? (values.length > 1 ? idx / (values.length - 1) : 0);
                    const displayTime = idx === 0 ? 0 : Math.round(currentKeyTime * 100);
                    const minTime = idx === 0 ? 0 : Math.round((keyTimes[idx - 1] ?? 0) * 100) + 1;
                    const maxTime = idx === values.length - 1 ? 100 : Math.round((keyTimes[idx + 1] ?? 1) * 100) - 1;

                    return (
                      <tr key={idx} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                        <td className="pl-2 py-1 text-muted-foreground">{idx + 1}</td>
                        {isTwoValue ? (
                          <>
                            <td className="px-1 py-1">
                              <Input
                                type="number"
                                step="1"
                                className="h-6 text-xs px-1.5 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={isPosition
                                  ? (Number.isFinite((val as Vec2)?.x) ? String(Math.round((val as Vec2).x)) : '')
                                  : (Number.isFinite((val as Size)?.w) ? String(Math.round((val as Size).w)) : '')}
                                onChange={(e) => {
                                  const arr = [...values];
                                  const n = Number(e.target.value);
                                  if (isPosition) {
                                    arr[idx] = { x: Number.isFinite(n) ? n : 0, y: (arr[idx] as Vec2)?.y ?? 0 };
                                  } else {
                                    arr[idx] = { w: Number.isFinite(n) ? n : 0, h: (arr[idx] as Size)?.h ?? 0 };
                                  }
                                  updateAnimation({ values: arr });
                                }}
                                disabled={!enabled}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input
                                type="number"
                                step="1"
                                className="h-6 text-xs px-1.5 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={isPosition
                                  ? (Number.isFinite((val as Vec2)?.y) ? String(Math.round((val as Vec2).y)) : '')
                                  : (Number.isFinite((val as Size)?.h) ? String(Math.round((val as Size).h)) : '')}
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
                            </td>
                          </>
                        ) : (
                          <td className="px-1 py-1">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="1"
                                className="h-6 text-xs px-1.5 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={isOpacity
                                  ? String(Math.round((typeof val === 'number' ? val : 1) * 100))
                                  : (Number.isFinite(Number(val)) ? String(Math.round(Number(val))) : '')}
                                onChange={(e) => {
                                  const arr = [...values];
                                  const n = Number(e.target.value);
                                  if (isOpacity) {
                                    const p = Math.max(0, Math.min(100, Math.round(n)));
                                    arr[idx] = Math.round(p) / 100;
                                  } else {
                                    arr[idx] = Number.isFinite(n) ? n : 0;
                                  }
                                  updateAnimation({ values: arr });
                                }}
                                disabled={!enabled}
                              />
                              {isOpacity && <span className="text-muted-foreground">%</span>}
                            </div>
                          </td>
                        )}
                        {useCustomKeyTimes && (
                          <td className="px-1 py-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  disabled={!enabled || idx === 0}
                                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${idx === 0
                                      ? 'bg-muted text-muted-foreground cursor-default'
                                      : 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                                    }`}
                                >
                                  {displayTime}%
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-3" align="center" side="left">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium">Keyframe Time</Label>
                                    <div className="flex items-center gap-0.5">
                                      <input
                                        type="number"
                                        step="1"
                                        min={minTime}
                                        max={maxTime}
                                        className="w-10 h-6 text-center text-sm font-mono bg-muted/50 rounded border border-border/50 focus:border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={displayTime}
                                        onChange={(e) => {
                                          const newKeyTimes = [...keyTimes];
                                          while (newKeyTimes.length < values.length) {
                                            const i = newKeyTimes.length;
                                            newKeyTimes.push(values.length > 1 ? i / (values.length - 1) : 0);
                                          }
                                          const n = Number(e.target.value);
                                          const clamped = Math.max(minTime, Math.min(maxTime, n));
                                          newKeyTimes[idx] = Number.isFinite(clamped) ? clamped / 100 : 0;
                                          updateAnimation({ keyTimes: newKeyTimes });
                                        }}
                                      />
                                      <span className="text-xs text-muted-foreground">%</span>
                                    </div>
                                  </div>
                                  <Slider
                                    value={[displayTime]}
                                    min={minTime}
                                    max={maxTime}
                                    step={1}
                                    onValueChange={(value) => {
                                      const newKeyTimes = [...keyTimes];
                                      while (newKeyTimes.length < values.length) {
                                        const i = newKeyTimes.length;
                                        newKeyTimes.push(values.length > 1 ? i / (values.length - 1) : 0);
                                      }
                                      newKeyTimes[idx] = value[0] / 100;
                                      updateAnimation({ keyTimes: newKeyTimes });
                                    }}
                                    className="w-full"
                                  />
                                  <p className="text-[10px] text-muted-foreground">
                                    Range: {minTime}% – {maxTime}%
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                        )}
                        <td className="px-1 py-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={() => {
                              const newValues = [...values];
                              newValues.splice(idx, 1);
                              if (useCustomKeyTimes) {
                                const newKeyTimes = [...keyTimes];
                                newKeyTimes.splice(idx, 1);
                                updateAnimation({ values: newValues, keyTimes: newKeyTimes });
                              } else {
                                updateAnimation({ values: newValues });
                              }
                            }}
                            disabled={!enabled}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-2">No keyframes yet. Click "+ Add" to create one.</div>
          )}
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
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
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
            Remove
          </Button>
        </div>
      </AccordionContent>
    </div>
  );
}