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
  "位置",
  "位置.x",
  "位置.y",
  "变换.旋转.x",
  "变换.旋转.y",
  "变换.旋转.z",
  "透明度",
  "边界",
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
          <SelectValue placeholder="添加动画" />
        </SelectTrigger>
        <SelectContent>
          {supportedAnimations
            .filter((kp) => !selectedBase?.animations?.some((a) => a.keyPath === kp))
            .map((kp) => (
              <SelectItem key={kp} value={kp}>
                {kp === 'position' ? '位置' : 
                 kp === 'position.x' ? '位置X' : 
                 kp === 'position.y' ? '位置Y' : 
                 kp === 'transform.rotation.x' ? '变换旋转X' : 
                 kp === 'transform.rotation.y' ? '变换旋转Y' : 
                 kp === 'transform.rotation.z' ? '变换旋转Z' : 
                 kp === 'opacity' ? '不透明度' : 
                 kp === 'bounds' ? '边界' : kp}
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
          title="启用动画"
        />
        <AccordionTrigger className="w-full">
          {keyPath === 'position' ? '位置' : 
           keyPath === 'position.x' ? '位置X' : 
           keyPath === 'position.y' ? '位置Y' : 
           keyPath === 'transform.rotation.x' ? '变换旋转X' : 
           keyPath === 'transform.rotation.y' ? '变换旋转Y' : 
           keyPath === 'transform.rotation.z' ? '变换旋转Z' : 
           keyPath === 'opacity' ? '不透明度' : 
           keyPath === 'bounds' ? '边界' : keyPath}
        </AccordionTrigger>
      </div>
      <AccordionContent>
        <div className={`grid grid-cols-2 gap-2 ${enabled ? '' : 'opacity-50'}`}>
          <div className="flex justify-between space-y-1 col-span-2">
            <Label>自动反转</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={(autoreverses ?? 0) === 1}
                onCheckedChange={(checked) => updateAnimation({ autoreverses: checked ? 1 : 0 })}
                disabled={!enabled}
              />
              <span className="text-xs text-muted-foreground">重复时反向</span>
            </div>
          </div>
          <div className="space-y-1 col-span-1">
            <Label htmlFor="anim-duration">持续时间 (秒)</Label>
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
            <Label htmlFor="anim-speed">速度</Label>
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
            <Label>无限循环</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={(infinite ?? 1) === 1}
                onCheckedChange={(checked) => updateAnimation({ infinite: checked ? 1 : 0 })}
                disabled={!enabled}
              />
              <span className="text-xs text-muted-foreground">关闭时，指定总重复时间。</span>
            </div>
          </div>
          {((infinite ?? 1) !== 1) && (
            <div className="space-y-1 col-span-2 mb-2">
              <Label htmlFor="anim-repeat">重复时间 (秒)</Label>
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
                if (keyPath.startsWith('transform.rotation')) return '数值 (度)';
                if (keyPath === 'position') return '数值 (CGPoint)';
                if (keyPath === 'opacity') return '数值 (百分比)';
                if (keyPath === 'bounds') return '数值 (CGRect)';
                return '数值 (数字)';
              })()}
            </Label>
            <div className="col-span-2 text-xs text-muted-foreground">
              {(() => {
                if (keyPath.startsWith('transform.rotation')) return '旋转角度的动画数值。';
                if (keyPath === 'position') return '作为x, y坐标的动画数值。';
                if (keyPath === 'opacity') return '作为不透明度百分比的动画数值。';
                if (keyPath === 'bounds') return '作为宽度、高度尺寸的动画数值。';
                return '作为数字的动画数值。';
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
              + 添加关键值
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
                        ? (isPosition ? 'X' : '宽度')
                        : (keyPath === 'position.x' ? 'X' : keyPath === 'position.y' ? 'Y' : isOpacity ? '不透明度' : '度数')}
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
                      <Label className="text-xs">{isPosition ? 'Y' : '高度'}</Label>
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
                      移除
                    </Button>
                  </div>
                </div>
              );
            })}
            {values.length === 0 && (
              <div className="text-xs text-muted-foreground">暂无关键值。点击"+ 添加关键值"以添加第一帧。</div>
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
              导出数值
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
            移除动画
          </Button>
        </div>
      </AccordionContent>
    </div>
  );
}