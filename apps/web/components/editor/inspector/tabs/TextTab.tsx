"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import type { InspectorTabProps } from "../types";

export function TextTab({
  selected,
  updateLayer,
}: Omit<InspectorTabProps, 'getBuf' | 'setBuf' | 'clearBuf' | 'round2' | 'fmt2' | 'fmt0' | 'updateLayerTransient' | 'selectedBase'>) {
  if (selected.type !== 'text') return null;
  const align = (((selected as any).align) || 'center') as 'left' | 'center' | 'right' | 'justified';

  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
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
      <div className="space-y-1 col-span-2">
        <Label htmlFor="fontFamily">Font</Label>
        <Select value={(selected as any).fontFamily || 'SFProText-Regular'}
          onValueChange={(v) => updateLayer(selected.id, { fontFamily: v } as any)}>
          <SelectTrigger className="h-8 text-xs w-full" id="fontFamily">
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SFProText-Regular">SFProText-Regular</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 col-span-2">
        <Label>Alignment</Label>
        <div className="grid grid-cols-4 gap-1">
          <Button
            variant={align === 'left' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-full"
            aria-pressed={align === 'left'}
            onClick={() => updateLayer(selected.id, { align: 'left' } as any)}
            title="Align left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={align === 'center' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-full"
            aria-pressed={align === 'center'}
            onClick={() => updateLayer(selected.id, { align: 'center' } as any)}
            title="Align center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={align === 'right' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-full"
            aria-pressed={align === 'right'}
            onClick={() => updateLayer(selected.id, { align: 'right' } as any)}
            title="Align right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant={align === 'justified' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-full"
            aria-pressed={align === 'justified'}
            onClick={() => updateLayer(selected.id, { align: 'justified' } as any)}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1 col-span-2">
        <Label>Wrap lines</Label>
        <div className="flex items-center gap-2 h-8">
          <Switch checked={(((selected as any).wrapped ?? 1) as number) === 1}
            onCheckedChange={(checked) => updateLayer(selected.id, { wrapped: (checked ? 1 : 0) as any } as any)} />
          <span className="text-xs text-muted-foreground">When on, drag horizontal bounds to wrap text.</span>
        </div>
      </div>
    </div>
  );
}
