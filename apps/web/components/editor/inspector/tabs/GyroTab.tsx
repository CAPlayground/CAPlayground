"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnyLayer } from "@/lib/ca/types";

interface GyroTabProps {
  selected: AnyLayer;
  wallpaperParallaxGroups: any[];
  setDoc: (updater: (prev: any) => any) => void;
}

export function GyroTab({
  selected,
  wallpaperParallaxGroups,
  setDoc,
}: GyroTabProps) {
  const transformLayerName = selected?.name;
  const layerDicts = wallpaperParallaxGroups.filter(d => d.layerName === transformLayerName);
  
  const addDictionary = () => {
    if (layerDicts.length >= 10) {
      return;
    }
    const newDict = {
      axis: 'x' as 'x' | 'y',
      image: 'null',
      keyPath: 'position.x' as any,
      layerName: transformLayerName || '',
      mapMaxTo: 50,
      mapMinTo: -50,
      title: 'New Gyro Effect',
      view: 'Floating',
    };
    setDoc((prev: any) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const currentDicts = prev.docs[key].wallpaperParallaxGroups || [];
      return {
        ...prev,
        docs: {
          ...prev.docs,
          [key]: {
            ...prev.docs[key],
            wallpaperParallaxGroups: [...currentDicts, newDict],
          },
        },
      };
    });
  };
  
  const updateDictionary = (index: number, updates: Partial<typeof layerDicts[0]>) => {
    setDoc((prev: any) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const allDicts = prev.docs[key].wallpaperParallaxGroups || [];
      const globalIndex = allDicts.findIndex((d: any, i: number) => d.layerName === transformLayerName && layerDicts.findIndex(ld => ld === d) === index);
      if (globalIndex === -1) return prev;
      const updated = [...allDicts];
      updated[globalIndex] = { ...updated[globalIndex], ...updates };
      return {
        ...prev,
        docs: {
          ...prev.docs,
          [key]: {
            ...prev.docs[key],
            wallpaperParallaxGroups: updated,
          },
        },
      };
    });
  };
  
  const removeDictionary = (index: number) => {
    setDoc((prev: any) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const allDicts = prev.docs[key].wallpaperParallaxGroups || [];
      const globalIndex = allDicts.findIndex((d: any, i: number) => d.layerName === transformLayerName && layerDicts.findIndex(ld => ld === d) === index);
      if (globalIndex === -1) return prev;
      const updated = allDicts.filter((_: any, i: number) => i !== globalIndex);
      return {
        ...prev,
        docs: {
          ...prev.docs,
          [key]: {
            ...prev.docs[key],
            wallpaperParallaxGroups: updated,
          },
        },
      };
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Gyro Dictionaries</Label>
          <Button 
            size="sm" 
            variant="outline"
            onClick={addDictionary}
            disabled={layerDicts.length >= 10}
          >
            + Add Dictionary
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure how this layer responds to device tilt. You can add up to 10 dictionaries (2 axes × 5 keyPaths) for this layer. ({layerDicts.length}/10)
        </p>
      </div>

      {layerDicts.length === 0 ? (
        <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
          暂无陀螺仪字典。点击"+ 添加字典"来创建一个。
        </div>
      ) : (
        layerDicts.map((dict, index) => (
          <Card key={index} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{dict.title || `Dictionary ${index + 1}`}</Label>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-destructive"
                onClick={() => removeDictionary(index)}
              >
                Remove
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`gyro-title-${index}`}>Title</Label>
                <Input 
                  id={`gyro-title-${index}`}
                  type="text" 
                  placeholder="e.g., Tilt Effect"
                  value={dict.title}
                  onChange={(e) => updateDictionary(index, { title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`gyro-axis-${index}`}>Axis</Label>
                <Select 
                  value={dict.axis}
                  onValueChange={(v) => updateDictionary(index, { axis: v as 'x' | 'y' })}
                >
                  <SelectTrigger id={`gyro-axis-${index}`}>
                    <SelectValue placeholder="Select axis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x">X (Left/Right)</SelectItem>
                    <SelectItem value="y">Y (Up/Down)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`gyro-keypath-${index}`}>Key Path</Label>
                <Select 
                  value={dict.keyPath}
                  onValueChange={(v) => updateDictionary(index, { keyPath: v as any })}
                >
                  <SelectTrigger id={`gyro-keypath-${index}`}>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                                <SelectItem value="position.x">位置X</SelectItem>
                                <SelectItem value="position.y">位置Y</SelectItem>
                                <SelectItem value="transform.translation.x">变换平移X</SelectItem>
                                <SelectItem value="transform.translation.y">变换平移Y</SelectItem>
                                <SelectItem value="transform.rotation.x">变换旋转X</SelectItem>
                                <SelectItem value="transform.rotation.y">变换旋转Y</SelectItem>                    {/* TODO: <SelectItem value="transform.rotation.z">transform.rotation.z</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`gyro-min-${index}`}>Map Min To</Label>
                  <Input 
                    id={`gyro-min-${index}`}
                    type="number" 
                    step="0.01" 
                    placeholder="e.g., -50"
                    value={dict.mapMinTo}
                    onChange={(e) => updateDictionary(index, { mapMinTo: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Min value (radians for rotation, px for position)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`gyro-max-${index}`}>Map Max To</Label>
                  <Input 
                    id={`gyro-max-${index}`}
                    type="number" 
                    step="0.01" 
                    placeholder="e.g., 50"
                    value={dict.mapMaxTo}
                    onChange={(e) => updateDictionary(index, { mapMaxTo: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max value (radians for rotation, px for position)
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`gyro-view-${index}`}>View</Label>
                <Input 
                  id={`gyro-view-${index}`}
                  type="text" 
                  value="Floating" 
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  陀螺仪壁纸的视图类型锁定为浮动
                </p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
