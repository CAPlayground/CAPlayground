"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fragment, useState } from "react";
import type { InspectorTabProps } from "../types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Plus, Minus } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useEditor } from "../../editor-context";
import { getParentAbsContextFor } from "../../canvas-preview/utils/coordinates";

interface GeometryTabProps extends InspectorTabProps {
  disablePosX: boolean;
  disablePosY: boolean;
  disablePosZ: boolean;
  disableRotX: boolean;
  disableRotY: boolean;
  disableRotZ: boolean;
  activeState?: string;
}

export function GeometryTab({
  selected,
  updateLayer,
  updateLayerTransient,
  getBuf,
  setBuf,
  clearBuf,
  round2,
  fmt2,
  fmt0,
  disablePosX,
  disablePosY,
  disablePosZ,
  disableRotX,
  disableRotY,
  disableRotZ,
  activeState,
}: GeometryTabProps) {
  const inState = !!activeState && activeState !== 'Base State';
  const selAx = (selected as any).anchorPoint?.x ?? 0.5;
  const selAy = (selected as any).anchorPoint?.y ?? 0.5;

  const standardValues = [0, 0.5, 1];
  const isStandardAnchor = standardValues.includes(selAx) && standardValues.includes(selAy);

  const [useCustomAnchor, setUseCustomAnchor] = useState(!isStandardAnchor);
  const [resizePercentage, setResizePercentage] = useState(10);
  const [showGeometryResize] = useLocalStorage<boolean>("caplay_settings_show_geometry_resize", false);
  const [showAlignButtons] = useLocalStorage<boolean>("caplay_settings_show_align_buttons", false);
  const [alignTarget, setAlignTarget] = useLocalStorage<'root' | 'parent'>("caplay_settings_align_target", 'parent');
  const { doc } = useEditor();

  const alignLayer = (horizontalAlign?: 'left' | 'center' | 'right', verticalAlign?: 'top' | 'center' | 'bottom') => {
    const key = doc?.activeCA ?? 'floating';
    const current = doc?.docs?.[key];
    if (!current) return;

    const layerWidth = selected.size.w;
    const layerHeight = selected.size.h;

    const parentContext = getParentAbsContextFor(
      selected.id,
      current.layers,
      doc?.meta.height ?? 0,
      doc?.meta.geometryFlipped
    );

    const findParentLayer = (layers: any[], targetId: string, parent: any = null): any => {
      for (const layer of layers) {
        if (layer.id === targetId) return parent;
        if (layer.children) {
          const found = findParentLayer(layer.children, targetId, layer);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const parentLayer = findParentLayer(current.layers, selected.id);
    const targetWidth = (alignTarget === 'root' || !parentLayer) ? (doc?.meta.width ?? 0) : parentLayer.size.w;
    const targetHeight = (alignTarget === 'root' || !parentLayer) ? (doc?.meta.height ?? 0) : parentContext.containerH;

    let targetCssLeft = 0;
    let targetCssTop = 0;

    if (horizontalAlign === 'left') {
      targetCssLeft = 0;
    } else if (horizontalAlign === 'center') {
      targetCssLeft = (targetWidth - layerWidth) / 2;
    } else if (horizontalAlign === 'right') {
      targetCssLeft = targetWidth - layerWidth;
    }

    if (verticalAlign === 'top') {
      targetCssTop = 0;
    } else if (verticalAlign === 'center') {
      targetCssTop = (targetHeight - layerHeight) / 2;
    } else if (verticalAlign === 'bottom') {
      targetCssTop = targetHeight - layerHeight;
    }

    const parentOffsetLeft = alignTarget === 'root' ? parentContext.left : 0;
    const parentOffsetTop = alignTarget === 'root' ? parentContext.top : 0;

    const relativeCssLeft = horizontalAlign ? targetCssLeft - parentOffsetLeft :
      selected.position.x - selAx * layerWidth;
    const relativeCssTop = verticalAlign ? targetCssTop - parentOffsetTop :
      (parentContext.useYUp ?
        (parentContext.containerH - (selected.position.y + (1 - selAy) * layerHeight)) :
        (selected.position.y - selAy * layerHeight));

    const newX = relativeCssLeft + selAx * layerWidth;
    const newY = parentContext.useYUp ?
      ((parentContext.containerH - relativeCssTop) - (1 - selAy) * layerHeight) :
      (relativeCssTop + selAy * layerHeight);

    updateLayer(selected.id, { position: { x: round2(newX), y: round2(newY) } as any });
  };
  return (
    <div>
      {(disablePosX || disablePosY || disableRotX || disableRotY || disableRotZ) && (
        <Alert className="mb-3">
          <AlertDescription className="text-xs">
            位置和旋转字段已禁用，因为此图层已启用关键帧动画。显示的值在播放期间实时更新。
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
        <div className="space-y-1">
          <Label htmlFor="pos-x">X</Label>
          <Input id="pos-x" type="number" step="0.01" value={getBuf('pos-x', fmt2(selected.position.x))}
            disabled={disablePosX}
            onChange={(e) => {
              setBuf('pos-x', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { position: { ...selected.position, x: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 0 : round2(Number(v));
              updateLayer(selected.id, { position: { ...selected.position, x: num } as any });
              clearBuf('pos-x');
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-y">Y</Label>
          <Input id="pos-y" type="number" step="0.01" value={getBuf('pos-y', fmt2(selected.position.y))}
            disabled={disablePosY}
            onChange={(e) => {
              setBuf('pos-y', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { position: { ...selected.position, y: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 0 : round2(Number(v));
              updateLayer(selected.id, { position: { ...selected.position, y: num } as any });
              clearBuf('pos-y');
            }} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="pos-z">Z</Label>
          <Input id="pos-z" type="number" step="0.01" value={getBuf('pos-z', fmt2(selected.zPosition))}
            disabled={disablePosZ}
            onChange={(e) => {
              setBuf('pos-z', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { zPosition: num });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 0 : round2(Number(v));
              updateLayer(selected.id, { zPosition: num });
              clearBuf('pos-z');
            }} />
        </div>
        {showAlignButtons && (
          <div className="space-y-1 col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label>对齐</Label>
              <Select value={alignTarget} onValueChange={(value: 'root' | 'parent') => setAlignTarget(value)}>
                <SelectTrigger className="h-7 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">对齐画布</SelectItem>
                  <SelectItem value="parent">对齐父级</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-6 gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alignLayer('left', undefined)}
                title="左对齐"
                disabled={disablePosX}
              >
                <AlignHorizontalJustifyStart className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alignLayer('center', undefined)}
                title="水平居中对齐"
                disabled={disablePosX}
              >
                <AlignHorizontalJustifyCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alignLayer('right', undefined)}
                title="右对齐"
                disabled={disablePosX}
              >
                <AlignHorizontalJustifyEnd className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alignLayer(undefined, 'top')}
                title="顶部对齐"
                disabled={disablePosY}
              >
                <AlignVerticalJustifyStart className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alignLayer(undefined, 'center')}
                title="垂直居中对齐"
                disabled={disablePosY}
              >
                <AlignVerticalJustifyCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alignLayer(undefined, 'bottom')}
                title="底部对齐"
                disabled={disablePosY}
              >
                <AlignVerticalJustifyEnd className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="w">宽度</Label>
          <Input id="w" type="number" step="0.01" value={getBuf('w', fmt2(selected.size.w))}
            disabled={selected.type === 'text' && (((selected as any).wrapped ?? 1) as number) !== 1}
            onChange={(e) => {
              setBuf('w', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { size: { ...selected.size, w: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 50 : round2(Number(v));
              updateLayer(selected.id, { size: { ...selected.size, w: num } as any });
              clearBuf('w');
            }} />
          <div className="flex items-center gap-1">
            {showGeometryResize && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 flex-1"
                  disabled={selected.type === 'text' && (((selected as any).wrapped ?? 1) as number) !== 1}
                  onClick={() => {
                    const factor = 1 - (resizePercentage / 100);
                    const newW = Math.max(0, round2(selected.size.w * factor));
                    updateLayer(selected.id, { size: { ...selected.size, w: newW } as any });
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="relative flex items-center justify-center w-12">
                  <Input
                    className="h-6 px-1 text-center text-xs pr-3"
                    value={resizePercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isNaN(val) && val >= 0) setResizePercentage(val);
                    }}
                  />
                  <span className="absolute right-1 text-[10px] text-muted-foreground pointer-events-none">%</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 flex-1"
                  disabled={selected.type === 'text' && (((selected as any).wrapped ?? 1) as number) !== 1}
                  onClick={() => {
                    const factor = 1 + (resizePercentage / 100);
                    const newW = round2(selected.size.w * factor);
                    updateLayer(selected.id, { size: { ...selected.size, w: newW } as any });
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="h">高度</Label>
          <Input id="h" type="number" step="0.01" value={getBuf('h', fmt2(selected.size.h))}
            disabled={selected.type === 'text'}
            onChange={(e) => {
              setBuf('h', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { size: { ...selected.size, h: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 50 : round2(Number(v));
              updateLayer(selected.id, { size: { ...selected.size, h: num } as any });
              clearBuf('h');
            }} />
          <div className="flex items-center gap-1">
            {showGeometryResize && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 flex-1"
                  disabled={selected.type === 'text'}
                  onClick={() => {
                    const factor = 1 - (resizePercentage / 100);
                    const newH = Math.max(0, round2(selected.size.h * factor));
                    updateLayer(selected.id, { size: { ...selected.size, h: newH } as any });
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="relative flex items-center justify-center w-12">
                  <Input
                    className="h-6 px-1 text-center text-xs pr-3"
                    value={resizePercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isNaN(val) && val >= 0) setResizePercentage(val);
                    }}
                  />
                  <span className="absolute right-1 text-[10px] text-muted-foreground pointer-events-none">%</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 flex-1"
                  disabled={selected.type === 'text'}
                  onClick={() => {
                    const factor = 1 + (resizePercentage / 100);
                    const newH = round2(selected.size.h * factor);
                    updateLayer(selected.id, { size: { ...selected.size, h: newH } as any });
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-1 col-span-2">
          <Label>旋转 (度)</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="rotation-x" className="text-xs">X轴</Label>
              <Input
                id="rotation-x"
                type="number"
                step="1"
                value={getBuf('rotationX', fmt0((selected as any).rotationX))}
                disabled={disableRotX}
                onChange={(e) => {
                  setBuf('rotationX', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const num = Math.round(Number(v));
                  if (Number.isFinite(num)) updateLayerTransient(selected.id, { rotationX: num as any } as any);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const num = v === "" ? 0 : Math.round(Number(v));
                  updateLayer(selected.id, { rotationX: num as any } as any);
                  clearBuf('rotationX');
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rotation-y" className="text-xs">Y轴</Label>
              <Input
                id="rotation-y"
                type="number"
                step="1"
                value={getBuf('rotationY', fmt0((selected as any).rotationY))}
                disabled={disableRotY}
                onChange={(e) => {
                  setBuf('rotationY', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const num = Math.round(Number(v));
                  if (Number.isFinite(num)) updateLayerTransient(selected.id, { rotationY: num as any } as any);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const num = v === "" ? 0 : Math.round(Number(v));
                  updateLayer(selected.id, { rotationY: num as any } as any);
                  clearBuf('rotationY');
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rotation-z" className="text-xs">Z轴</Label>
              <Input
                id="rotation-z"
                type="number"
                step="1"
                value={getBuf('rotation', fmt0(selected.rotation))}
                disabled={disableRotZ}
                onChange={(e) => {
                  setBuf('rotation', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const num = Math.round(Number(v));
                  if (Number.isFinite(num)) updateLayerTransient(selected.id, { rotation: num as any });
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const num = v === "" ? 0 : Math.round(Number(v));
                  updateLayer(selected.id, { rotation: num as any });
                  clearBuf('rotation');
                }}
              />
            </div>
          </div>
        </div>
        {selected.type !== 'emitter' && (
          <div className="space-y-1 col-span-2">
            <Label>锚点</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={inState ? 'opacity-50 pointer-events-none' : ''}>
                  {!useCustomAnchor ? (
                    <div className="grid grid-cols-3 gap-1">
                      {([1, 0.5, 0] as number[]).map((ay, rowIdx) => (
                        <Fragment key={`row-${rowIdx}`}>
                          {([0, 0.5, 1] as number[]).map((ax, colIdx) => {
                            const isActive = Math.abs(selAx - ax) < 1e-6 && Math.abs(selAy - ay) < 1e-6;
                            return (
                              <Button key={`ap-${rowIdx}-${colIdx}`} type="button" variant={isActive ? 'default' : 'outline'} size="sm"
                                disabled={inState}
                                onClick={() => updateLayer(selected.id, { anchorPoint: { x: ax, y: ay } as any })}>
                                {ax},{ay}
                              </Button>
                            );
                          })}
                        </Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="anchor-x" className="text-xs">X ({Math.round(selAx * 100)}%)</Label>
                        </div>
                        <Slider
                          id="anchor-x"
                          min={0}
                          max={100}
                          step={1}
                          disabled={inState}
                          value={[Math.round(selAx * 100)]}
                          onValueChange={([val]) => {
                            const newX = val / 100;
                            updateLayerTransient(selected.id, { anchorPoint: { x: newX, y: selAy } as any });
                          }}
                          onValueCommit={([val]) => {
                            const newX = val / 100;
                            updateLayer(selected.id, { anchorPoint: { x: newX, y: selAy } as any });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="anchor-y" className="text-xs">Y ({Math.round(selAy * 100)}%)</Label>
                        </div>
                        <Slider
                          id="anchor-y"
                          min={0}
                          max={100}
                          step={1}
                          disabled={inState}
                          value={[Math.round(selAy * 100)]}
                          onValueChange={([val]) => {
                            const newY = val / 100;
                            updateLayerTransient(selected.id, { anchorPoint: { x: selAx, y: newY } as any });
                          }}
                          onValueCommit={([val]) => {
                            const newY = val / 100;
                            updateLayer(selected.id, { anchorPoint: { x: selAx, y: newY } as any });
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      id="custom-anchor"
                      checked={useCustomAnchor}
                      disabled={inState}
                      onCheckedChange={(checked) => {
                        setUseCustomAnchor(checked);
                        if (!checked) {
                          const nearestX = standardValues.reduce((prev, curr) =>
                            Math.abs(curr - selAx) < Math.abs(prev - selAx) ? curr : prev
                          );
                          const nearestY = standardValues.reduce((prev, curr) =>
                            Math.abs(curr - selAy) < Math.abs(prev - selAy) ? curr : prev
                          );
                          updateLayer(selected.id, { anchorPoint: { x: nearestX, y: nearestY } as any });
                        }
                      }}
                    />
                                    <Label htmlFor="custom-anchor" className="text-xs text-muted-foreground cursor-pointer">
                                      使用自定义锚点
                                    </Label>                  </div>
                </div>
              </TooltipTrigger>
              {inState && <TooltipContent sideOffset={6}>状态转换不支持</TooltipContent>}
            </Tooltip>
          </div>
        )}
        <div className="space-y-1 col-span-2">
          <Label>Flip Geometry</Label>
          <div className="flex items-center gap-2 h-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch checked={(((selected as any).geometryFlipped ?? 0) === 1)}
                    disabled={inState}
                    onCheckedChange={(checked) => updateLayer(selected.id, { geometryFlipped: (checked ? 1 : 0) as any })} />
                </div>
              </TooltipTrigger>
              {inState && <TooltipContent sideOffset={6}>状态转换不支持</TooltipContent>}
            </Tooltip>
            <span className="text-xs text-muted-foreground">影响此图层子图层的坐标系统。</span>
          </div>
        </div>
      </div>
    </div>
  );
}
