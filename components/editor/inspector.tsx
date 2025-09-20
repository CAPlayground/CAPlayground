"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditor } from "./editor-context";
import type { AnyLayer } from "@/lib/ca/types";
import { useEffect, useMemo, useRef, useState } from "react";

export function Inspector() {
  const { doc, updateLayer, updateLayerTransient, replaceImageForLayer, isAnimationPlaying, animatedLayers } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const fmt2 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? round2(n).toFixed(2) : "");
  const fmt0 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n).toString() : "");
  const findById = (layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined => {
    if (!id) return undefined;
    for (const l of layers) {
      if (l.id === id) return l;
      if (l.type === "group") {
        const found = findById(l.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const selectedBase = current ? findById(current.layers, current.selectedId) : undefined;
  
  const selectedAnimated = useMemo(() => {
    if (!isAnimationPlaying || !animatedLayers.length || !current?.selectedId) return null;
    return findById(animatedLayers, current.selectedId);
  }, [isAnimationPlaying, animatedLayers, current?.selectedId]);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const selKey = selectedBase ? selectedBase.id : "__none__";
  useEffect(() => {
    setInputs({});
  }, [selKey]);
  const getBuf = (key: string, fallback: string): string => {
    const bufKey = `${selKey}:${key}`;
    return inputs[bufKey] !== undefined ? inputs[bufKey] : fallback;
  };
  const setBuf = (key: string, val: string) => {
    const bufKey = `${selKey}:${key}`;
    setInputs((prev) => ({ ...prev, [bufKey]: val }));
  };
  const clearBuf = (key: string) => {
    const bufKey = `${selKey}:${key}`;
    setInputs((prev) => {
      const next = { ...prev } as any;
      delete next[bufKey];
      return next;
    });
  };
  const selected = (() => {
    if (!current || !selectedBase) return selectedBase;

    if (selectedAnimated) return selectedAnimated;
    
    const state = current.activeState;
    if (!state || state === 'Base State') return selectedBase;
    const eff: AnyLayer = JSON.parse(JSON.stringify(selectedBase));
    const ovs = (current.stateOverrides || {})[state] || [];
    const me = ovs.filter(o => o.targetId === eff.id);
    for (const o of me) {
      const kp = (o.keyPath || '').toLowerCase();
      const v = o.value as number | string;
      if (kp === 'position.x' && typeof v === 'number') eff.position.x = v;
      else if (kp === 'position.y' && typeof v === 'number') eff.position.y = v;
      else if (kp === 'bounds.size.width' && typeof v === 'number') eff.size.w = v;
      else if (kp === 'bounds.size.height' && typeof v === 'number') eff.size.h = v;
      else if (kp === 'transform.rotation.z' && typeof v === 'number') (eff as any).rotation = v as number;
      else if (kp === 'opacity' && typeof v === 'number') (eff as any).opacity = v as number;
    }
    return eff;
  })();

  const animEnabled: boolean = !!(selectedBase as any)?.animations?.enabled;
  
  const {
    disablePosX,
    disablePosY,
    disableRotX,
    disableRotY,
    disableRotZ,
  } = useMemo(() => {
    const a: any = (selectedBase as any)?.animations || {};
    const enabled = !!a.enabled;
    const kp: string = a.keyPath || '';
    const hasValues = Array.isArray(a.values) && a.values.length > 0;
    const on = (cond: boolean) => enabled && hasValues && cond;
    return {
      disablePosX: on(kp === 'position' || kp === 'position.x'),
      disablePosY: on(kp === 'position' || kp === 'position.y'),
      disableRotX: on(kp === 'transform.rotation.x'),
      disableRotY: on(kp === 'transform.rotation.y'),
      disableRotZ: on(kp === 'transform.rotation.z'),
    };
  }, [selectedBase]);

  if (!selected) {
    return (
      <Card className="p-3 h-full">
        <div className="font-medium mb-2">Inspector</div>
        <div className="text-sm text-muted-foreground">Select a layer to edit its properties.</div>
      </Card>
    );
  }

  return (
    <Card className="p-3 h-full flex flex-col overflow-hidden">
      <div className="font-medium mb-2 shrink-0">Inspector</div>
      <div className="min-h-0 overflow-y-auto pr-1">
      {current?.activeState && current.activeState !== 'Base State' && (
        <Alert className="text-xs">
          <AlertDescription>
            Note: Rotation and Bound state transitions don't work when tested. If you know a fix or it just works for you, please report in the CAPlayground Discord server.
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="multiple" defaultValue={["geom","comp","content","text","image","anim"]} className="space-y-1">
        <AccordionItem value="geom">
          <AccordionTrigger className="py-2 text-xs">Geometry</AccordionTrigger>
          <AccordionContent className="pb-2">
            {(disablePosX || disablePosY || disableRotX || disableRotY || disableRotZ) && (
              <Alert className="mb-3">
                <AlertDescription className="text-xs">
                  Position and rotation fields are disabled because this layer has keyframe animations enabled. The values shown update live during playback.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-1.5">
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
        <div className="space-y-1">
          <Label htmlFor="w">Width</Label>
          <Input id="w" type="number" step="0.01" value={getBuf('w', fmt2(selected.size.w))}
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
        </div>
        <div className="space-y-1">
          <Label htmlFor="h">Height</Label>
          <Input id="h" type="number" step="0.01" value={getBuf('h', fmt2(selected.size.h))}
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
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Rotation (deg)</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="rotation-x" className="text-xs">X</Label>
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
              <Label htmlFor="rotation-y" className="text-xs">Y</Label>
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
              <Label htmlFor="rotation-z" className="text-xs">Z</Label>
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
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="comp">
          <AccordionTrigger className="py-2 text-xs">Compositing</AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-1">
          <Label htmlFor="opacity">Opacity (%)</Label>
          <Input
            id="opacity"
            type="number"
            min={0}
            max={100}
            step={1}
            value={fmt0(typeof selected.opacity === "number" ? Math.round((selected.opacity || 0) * 100) : 100)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              const pct = Math.max(0, Math.min(100, Math.round(Number(v))));
              const next = pct / 100;
              updateLayer(selected.id, { opacity: Number.isFinite(next) ? next : (undefined as any) });
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>Shadow</Label>
          <div className="flex items-center gap-2 h-9">
            <Checkbox disabled />
            <span className="text-sm text-muted-foreground">(placeholder)</span>
          </div>
        </div>
        {selected.type === "shape" && (
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
        )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="content">
          <AccordionTrigger className="py-2 text-xs">Content</AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-1">
          <Label>No background colour</Label>
          <div className="flex items-center gap-2 h-9">
            <Checkbox disabled />
            <span className="text-sm text-muted-foreground">(placeholder)</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="backgroundColor">Background colour</Label>
          <Input
            id="backgroundColor"
            type="color"
            value={(selected as any).backgroundColor ?? "#ffffff"}
            onChange={(e) => updateLayer(selected.id, { backgroundColor: e.target.value } as any)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="borderColor">Border colour</Label>
          <Input
            id="borderColor"
            type="color"
            value={(selected as any).borderColor ?? "#000000"}
            onChange={(e) => updateLayer(selected.id, { borderColor: e.target.value } as any)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="borderWidth">Border width</Label>
          <Input
            id="borderWidth"
            type="number"
            step={1}
            value={fmt0((selected as any).borderWidth)}
            onChange={(e) => {
              const v = e.target.value;
              updateLayer(selected.id, { borderWidth: v === "" ? (undefined as any) : Math.max(0, Math.round(Number(v))) } as any);
            }}
          />
        </div>
        {selected.type === "shape" && (
          <div className="space-y-1">
            <Label htmlFor="fill">Fill</Label>
            <Input id="fill" type="color" value={(selected as any).fill}
              onChange={(e) => updateLayer(selected.id, { fill: e.target.value } as any)} />
          </div>
        )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Text */}
        {selected.type === "text" && (
          <AccordionItem value="text">
            <AccordionTrigger className="py-2 text-xs">Text</AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1 col-span-2">
            <Label htmlFor="text">Text</Label>
            <Input id="text" value={selected.text}
              onChange={(e) => updateLayer(selected.id, { text: e.target.value } as any)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fontSize">Font size</Label>
            <Input id="fontSize" type="number" value={selected.fontSize}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") return;
                updateLayer(selected.id, { fontSize: Number(v) } as any)
              }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color">Color</Label>
            <Input id="color" type="color" value={selected.color}
              onChange={(e) => updateLayer(selected.id, { color: e.target.value } as any)} />
          </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Image */}
        {selected.type === "image" && (
          <AccordionItem value="image">
            <AccordionTrigger className="py-2 text-xs">Image</AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1 col-span-2">
            <Label>Image</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace Image…
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const img = new Image();
                    const src = (selected as any).src as string;
                    await new Promise<void>((resolve, reject) => {
                      img.onload = () => resolve();
                      img.onerror = reject;
                      img.src = src;
                    });
                    const w = img.naturalWidth || 0;
                    const h = img.naturalHeight || 0;
                    if (w > 0 && h > 0) {
                      updateLayer(selected.id, { size: { ...selected.size, w, h } as any });
                    }
                  } catch (e) {
                  }
                }}
              >
                Reset Bounds
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await replaceImageForLayer(selected.id, file);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            </div>
          </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Animations */}
        <AccordionItem value="anim">
          <AccordionTrigger className="py-2 text-xs">Animations</AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Enable animation</Label>
                <Switch
                  checked={!!(selectedBase as any)?.animations?.enabled}
                  onCheckedChange={(checked) => {
                    const enabled = !!checked;
                    const current = (selectedBase as any)?.animations || {};
                    updateLayer(selectedBase!.id, { animations: { ...current, enabled, keyPath: (current.keyPath ?? 'position'), autoreverses: (current.autoreverses ?? 0), values: (current.values ?? []) } } as any);
                  }}
                />
              </div>
              <div className={`grid grid-cols-2 gap-2 ${animEnabled ? '' : 'opacity-50'}`}>
                <div className="space-y-1">
                  <Label>Key path</Label>
                  <Select
                    value={((selectedBase as any)?.animations?.keyPath ?? 'position') as any}
                    onValueChange={(v) => {
                      const current = (selectedBase as any)?.animations || {};
                      const kp = v as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
                      const prevVals = (current.values || []) as Array<{ x: number; y: number } | number>;
                      let values: Array<{ x: number; y: number } | number> = [];
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
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
                <div className="space-y-1">
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
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {(() => {
                      const kp = ((selectedBase as any)?.animations?.keyPath ?? 'position') as string;
                      if (kp.startsWith('transform.rotation')) return 'Values (Degrees)';
                      if (kp === 'position') return 'Values (CGPoint)';
                      return 'Values (Number)';
                    })()}
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const current = (selectedBase as any)?.animations || {};
                      const kp = (current.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
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
                    const kp = ((selectedBase as any)?.animations?.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
                    const values = (((selectedBase as any)?.animations?.values || []) as Array<any>);
                    if (kp === 'position') {
                      return (
                        <>
                          {values.map((pt, idx) => (
                            <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">X</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  className="h-8"
                                  value={Number.isFinite(pt?.x) ? String(Math.round(pt.x)) : ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const current = (selectedBase as any)?.animations || {};
                                    const arr = [...(current.values || [])];
                                    const n = Number(v);
                                    arr[idx] = { x: Number.isFinite(n) ? n : 0, y: arr[idx]?.y ?? 0 };
                                    updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                                  }}
                                  disabled={!animEnabled}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Y</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  className="h-8"
                                  value={Number.isFinite(pt?.y) ? String(Math.round(pt.y)) : ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const current = (selectedBase as any)?.animations || {};
                                    const arr = [...(current.values || [])];
                                    const n = Number(v);
                                    arr[idx] = { x: arr[idx]?.x ?? 0, y: Number.isFinite(n) ? n : 0 };
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
                              <Label className="text-xs">{kp === 'position.x' ? 'X' : kp === 'position.y' ? 'Y' : 'Degrees'}</Label>
                              <Input
                                type="number"
                                step="1"
                                className="h-8"
                                value={Number.isFinite(Number(val)) ? String(Math.round(Number(val))) : ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const current = (selectedBase as any)?.animations || {};
                                  const arr = [...(current.values || [])];
                                  const n = Number(v);
                                  arr[idx] = Number.isFinite(n) ? n : 0;
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
                  })()}
                  {(((selectedBase as any)?.animations?.values || []) as any[]).length === 0 && (
                    <div className="text-xs text-muted-foreground">No key values yet. Click "+ Add key value" to add the first keyframe.</div>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      </div>
    </Card>
  );
}
