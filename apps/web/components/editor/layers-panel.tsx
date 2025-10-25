"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, ChevronRight, ChevronDown, Copy, Trash2, Check } from "lucide-react";
import { useEditor } from "./editor-context";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnyLayer, GroupLayer } from "@/lib/ca/types";

export function LayersPanel() {
  const {
    doc,
    selectLayer,
    addTextLayer,
    addImageLayerFromFile,
    addShapeLayer,
    addGradientLayer,
    addVideoLayerFromFile,
    deleteLayer,
    duplicateLayer,
    moveLayer,
    moveLayerInto,
    updateLayer,
    addEmitterLayer,
  } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const layers = current?.layers ?? [];
  const selectedId = current?.selectedId ?? null;
  const selectedLayer = layers.find(l => l.id === selectedId)

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [rootCollapsed, setRootCollapsed] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectMode) {
        setIsSelectMode(false);
        setMultiSelectedIds([]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSelectMode]);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startRename = (l: AnyLayer) => {
    setEditingId(l.id);
    setEditingName(l.name || "");
  };
  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };
  const commitRename = () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (name) updateLayer(editingId, { name } as any);
    cancelRename();
  };

  const toggleMultiSelect = (id: string) => {
    setMultiSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderItem = (l: AnyLayer, depth: number) => {
    const isGroup = l.type === "group";
    const hasChildren = isGroup && (l as GroupLayer).children.length > 0;
    const isCollapsed = collapsed.has(l.id);
    const isChecked = multiSelectedIds.includes(l.id);

    const showDropLineBefore = dragOverId === l.id && dropPosition === 'before';
    const showDropLineAfter = dragOverId === l.id && dropPosition === 'after';

    const row = (
      <div
        key={l.id}
        className="relative"
      >
        {showDropLineBefore && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-accent z-10"
            style={{ top: 0, marginLeft: 8 + depth * 16 }}
          />
        )}
        <div
          className={`py-2 flex items-center justify-between cursor-pointer ${selectedId === l.id ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelectMode) toggleMultiSelect(l.id);
            else selectLayer(l.id);
          }}
          onDoubleClick={() => startRename(l)}
          style={{ paddingLeft: 8 + depth * 16 }}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('text/cap-layer-id', l.id);
            try { e.dataTransfer.effectAllowed = 'move'; } catch {}
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseY = e.clientY;
            const relativeY = mouseY - rect.top;
            const position = relativeY < rect.height / 2 ? 'before' : 'after';
            setDragOverId(l.id);
            setDropPosition(position);
          }}
          onDragLeave={() => {
            setDragOverId((prev) => (prev === l.id ? null : prev));
            setDropPosition(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const src = e.dataTransfer.getData('text/cap-layer-id');
            const position = dropPosition;
            setDragOverId(null);
            setDropPosition(null);
            if (!src || src === l.id) return;
            if (isGroup && (e.altKey || e.ctrlKey || e.metaKey)) {
              moveLayerInto(src, l.id);
            } else {
              let beforeId = l.id;
              if (position === 'after') {
                const findNextSibling = (layers: AnyLayer[], targetId: string): string | null => {
                  for (let i = 0; i < layers.length; i++) {
                    if (layers[i].id === targetId) {
                      return i < layers.length - 1 ? layers[i + 1].id : null;
                    }
                    if (layers[i].type === 'group') {
                      const result = findNextSibling((layers[i] as GroupLayer).children, targetId);
                      if (result !== undefined) return result;
                    }
                  }
                  return undefined as any;
                };
                const nextId = findNextSibling(layers, l.id);
                beforeId = nextId !== undefined ? nextId : null as any;
              }
              moveLayer(src, beforeId);
            }
          }}
        >
          <div className="truncate flex-1 min-w-0 flex items-center gap-1">
            {isSelectMode ? (
              <button
                className={`shrink-0 h-4 w-4 rounded-full border ${isChecked ? 'bg-accent border-accent' : 'border-muted-foreground/50'} mr-1`}
                onClick={(e) => { e.stopPropagation(); toggleMultiSelect(l.id); }}
                aria-label={isChecked ? 'Deselect layer' : 'Select layer'}
                title={isChecked ? 'Deselect' : 'Select'}
              />
            ) : (
              hasChildren ? (
                <button
                  onClick={(e) => toggleCollapse(l.id, e)}
                  className="shrink-0 hover:bg-accent/50 rounded p-0.5"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <div className="w-4 shrink-0" />
              )
            )}
            {editingId === l.id ? (
              <input
                className="w-full bg-transparent border border-muted rounded-sm px-1 py-0.5 text-sm"
                value={editingName}
                autoFocus
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => commitRename()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  else if (e.key === 'Escape') cancelRename();
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {l.name}{' '}
                <span className="text-muted-foreground">
                  ({(((l as any)._displayType || l.type) === 'shape') ? 'basic' : ((l as any)._displayType || l.type)})
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 pr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); }}
                  aria-label="More actions"
                  title="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => startRename(l)}>Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateLayer(l.id)}>Duplicate</DropdownMenuItem>
                <DropdownMenuItem onClick={() => deleteLayer(l.id)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setIsSelectMode(true); setMultiSelectedIds((prev) => prev.includes(l.id) ? prev : [...prev, l.id]); }}>Select</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {showDropLineAfter && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-accent z-10"
            style={{ bottom: 0, marginLeft: 8 + depth * 16 }}
          />
        )}
      </div>
    );
    if (isGroup && !isCollapsed) {
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
    <Card className="p-0 gap-0 h-full min-h-0 flex flex-col" data-tour-id="layers-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="font-medium">Layers</div>
        {uploadStatus && (
          <div className="text-xs text-muted-foreground animate-pulse">
            {uploadStatus}
          </div>
        )}
        {selectedLayer?.type === 'emitter' ? (
          <Tooltip disableHoverableContent={true}>
            <TooltipTrigger asChild>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  disabled={selectedLayer?.type === 'emitter'}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Layer
                </Button>
              </div>
            </TooltipTrigger>
            {selectedLayer?.type === 'emitter' &&
              <TooltipContent sideOffset={6}>
                Sublayers are not supported for emitter layers.
              </TooltipContent>
            }
          </Tooltip>
        ) :
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Plus className="h-4 w-4 mr-1" /> Add Layer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addTextLayer()}>Text Layer</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addShapeLayer("rect")}>Basic Layer</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addGradientLayer()}>Gradient Layer</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>Image Layer…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => videoInputRef.current?.click()}>Video Layer…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addEmitterLayer()}>Emitter Layer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp,image/svg+xml"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const hasGif = files.some(f => /image\/gif/i.test(f.type) || /\.gif$/i.test(f.name || ''));
            if (hasGif) {
              setUploadStatus('GIFs must be imported via Video Layer…');
              setTimeout(() => setUploadStatus(null), 2000);
            }
            const imageFiles = files.filter(f => !(/image\/gif/i.test(f.type) || /\.gif$/i.test(f.name || '')));
            if (imageFiles.length) setUploadStatus(imageFiles.length > 1 ? `Uploading ${imageFiles.length} images...` : 'Uploading image...');
            try {
              for (const file of imageFiles) {
                try { await addImageLayerFromFile(file); } catch {}
              }
            } finally {
              setUploadStatus(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*,image/gif"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const isGif = /image\/gif/i.test(file.type || '') || /\.gif$/i.test(file.name || '');
              setUploadStatus(isGif ? 'Importing GIF as video...' : 'Uploading video...');
              try {
                await addVideoLayerFromFile(file);
              } catch (err) {
                console.error('Failed to add video layer:', err);
              } finally {
                setUploadStatus(null);
              }
            }
            if (videoInputRef.current) videoInputRef.current.value = "";
          }}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="text-sm rounded-lg border bg-card shadow-sm flex flex-col overflow-hidden min-h-0 h-full">
          <div
            className="flex-1 min-h-0 max-h-full overflow-y-auto overscroll-contain"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => {
              const src = e.dataTransfer.getData('text/cap-layer-id');
              setDragOverId(null);
              if (!src) return;
              moveLayer(src, null);
            }}
            onClick={() => selectLayer(null)}
          >
            <div
              className={`py-2 pl-2 pr-2 font-medium select-none cursor-pointer flex items-center gap-1 ${selectedId === '__root__' ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
              onClick={(e) => { e.stopPropagation(); selectLayer('__root__' as any); }}
            >
              {layers.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRootCollapsed(!rootCollapsed);
                  }}
                  className="shrink-0 hover:bg-accent/50 rounded p-0.5"
                >
                  {rootCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <div className="w-4 shrink-0" />
              )}
              <span>Root Layer</span>
            </div>
            {!rootCollapsed && (
              <>
                {layers.length === 0 && (
                  <div className="py-2 text-muted-foreground" style={{ paddingLeft: 24 }}>No layers yet</div>
                )}
                {layers.map((l) => renderItem(l, 1))}
              </>
            )}
          </div>
        </div>
      </div>

      {isSelectMode && (
          <div className="border-t p-2 gap-2 flex flex-col">
            <div className="text-xs text-muted-foreground">
              {multiSelectedIds.length} selected
            </div>
            <div className="flex gap-2 items-center w-full">
              <Button
                variant="outline"
                size="icon"
                disabled={multiSelectedIds.length === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  for (const id of multiSelectedIds) {
                    try { duplicateLayer(id); } catch {}
                  }
                }}
                className="h-8 w-8"
                title="Duplicate layers"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={multiSelectedIds.length === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  for (const id of multiSelectedIds) {
                    try { deleteLayer(id); } catch {}
                  }
                  setMultiSelectedIds([]);
                }}
                className="h-8 w-8"
                title="Delete layers"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => { setIsSelectMode(false); setMultiSelectedIds([]); }}
                className="flex-1 gap-1.5"
              >
                <Check className="h-4 w-4" />
                Done
              </Button>
            </div>
          </div>
        )}
    </Card>
  );
}
