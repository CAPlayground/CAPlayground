"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Copy } from "lucide-react";
import { useEditor } from "./editor-context";
import { useRef } from "react";
import type { AnyLayer, GroupLayer } from "@/lib/ca/types";

export function LayersPanel() {
  const { doc, selectLayer, addTextLayer, addImageLayerFromFile, addShapeLayer, deleteLayer, duplicateLayer } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const layers = current?.layers ?? [];
  const selectedId = current?.selectedId ?? null;

  const renderItem = (l: AnyLayer, depth: number) => {
    const row = (
      <div
        key={l.id}
        className={`px-2 py-2 flex items-center justify-between cursor-pointer ${selectedId === l.id ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
        onClick={() => selectLayer(l.id)}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <div className="truncate">
          {l.name} <span className="text-muted-foreground">({l.type === "shape" ? "basic" : l.type})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id); }}
            aria-label="Duplicate layer"
            title="Duplicate layer"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); deleteLayer(l.id); }}
            aria-label="Delete layer"
            title="Delete layer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
    if (l.type === "group") {
      const g = l as GroupLayer;
      return (
        <div key={l.id}>
          {row}
          {g.children.map((c) => renderItem(c, depth + 1))}
        </div>
      );
    }
    return row;
  };

  return (
    <Card className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Layers</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2">
              <Plus className="h-4 w-4 mr-1" /> Add Layer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={addTextLayer}>Text Layer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => addShapeLayer("rect")}>Basic Layer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Image Layer…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await addImageLayerFromFile(file);
            }
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      </div>

      <div className="text-sm rounded border bg-muted/30 divide-y flex flex-col overflow-hidden">
        <div className="px-2 py-2 font-medium select-none">Root Layer</div>
        <div className="flex-1 overflow-auto">
          {layers.length === 0 && (
            <div className="px-2 py-2 text-muted-foreground">No layers yet</div>
          )}
          {layers.map((l) => renderItem(l, 0))}
        </div>
      </div>
    </Card>
  );
}
