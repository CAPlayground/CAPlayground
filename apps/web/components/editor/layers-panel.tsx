"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, ChevronRight, ChevronDown, Copy, Trash2, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useEditor } from "./editor-context";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnyLayer } from "@/lib/ca/types";
import { isChromiumBrowser } from "@/lib/browser";
import VideoLayerDialog from "./VideoLayerDialog";

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
    updateLayer,
    addEmitterLayer,
    addTransformLayer,
    addReplicatorLayer,
    addLiquidGlassLayer,
    hiddenLayerIds,
    toggleLayerVisibility,
  } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const layers = current?.layers ?? [];
  const isGyro = doc?.meta?.gyroEnabled ?? false;
  const selectedId = current?.selectedId ?? null;
  const selectedLayer = layers.find(l => l.id === selectedId)

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'into' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [rootCollapsed, setRootCollapsed] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [isChromium, setIsChromium] = useState(true);
  const [videoLayerIsOpen, setVideoLayerIsOpen] = useState(false);

  useEffect(() => {
    setIsChromium(isChromiumBrowser());
  }, []);

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

  useEffect(() => {
    if (multiSelectedIds.length === 0) return;

    const existsInLayers = (id: string, layerList: AnyLayer[]): boolean => {
      for (const layer of layerList) {
        if (layer.id === id) return true;
        if (layer.children && existsInLayers(id, layer.children)) return true;
      }
      return false;
    };

    const validIds = multiSelectedIds.filter(id => existsInLayers(id, layers));
    if (validIds.length !== multiSelectedIds.length) {
      setMultiSelectedIds(validIds);
    }
  }, [layers, multiSelectedIds]);

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
    const isProtected = l.name === 'FLOATING' || l.name === 'BACKGROUND';
    const hasChildren = l.type !== 'video' && (l.children?.length ?? 0) > 0;
    const isCollapsed = collapsed.has(l.id);
    const isChecked = multiSelectedIds.includes(l.id);
    const isHidden = hiddenLayerIds.has(l.id);

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
            style={{ top: 0, marginLeft: 8 + depth * 16, pointerEvents: 'none' }}
          />
        )}
        <div
          className={`py-2 flex items-center justify-between cursor-pointer ${selectedId === l.id && !dragOverId ? 'bg-accent/30' : 'hover:bg-muted/50'} ${dragOverId === l.id && dropPosition === 'into' ? 'bg-accent/30' : ''} ${isHidden ? 'opacity-50' : ''}`}
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
            try { e.dataTransfer.effectAllowed = 'move'; } catch { }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseY = e.clientY;
            const relativeY = mouseY - rect.top;
            const isBefore = relativeY < rect.height / 4;
            const isAfter = relativeY > rect.height * 3 / 4;
            const position = isBefore ? 'before' : isAfter ? 'after' : 'into';
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
            if (position) moveLayer(src, l.id, position);
          }}
        >
          <div className="truncate flex-1 min-w-0 flex items-center gap-1">
            {isSelectMode && !isProtected ? (
              <button
                className={`shrink-0 h-4 w-4 rounded-full border ${isChecked ? 'bg-accent border-accent' : 'border-muted-foreground/50'} mr-1`}
                onClick={(e) => { e.stopPropagation(); toggleMultiSelect(l.id); }}
                aria-label={isChecked ? '取消选择图层' : '选择图层'}
                title={isChecked ? '取消选择' : '选择'}
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
            {l.type === 'liquidGlass' && !isChromium && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3.5 w-3.5 ml-1 text-amber-600 dark:text-amber-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-semibold mb-1">不可见</p>
                  <p className="text-xs">
                    此图层仅在基于Chromium的浏览器中工作，在当前浏览器中将不可见。
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerVisibility(l.id);
                              }}
                              aria-label={isHidden ? '显示图层' : '隐藏图层'}
                              title={isHidden ? '显示图层' : '隐藏图层'}
                            >
                              {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
            {!isProtected && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={(e) => { e.stopPropagation(); }}
                    aria-label="更多操作"
                    title="更多操作"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => startRename(l)}>重命名</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateLayer(l.id)}>复制</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteLayer(l.id)} className="text-destructive focus:text-destructive">删除</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setIsSelectMode(true); setMultiSelectedIds((prev) => prev.includes(l.id) ? prev : [...prev, l.id]); }}>选择</DropdownMenuItem>                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {showDropLineAfter && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-accent z-10"
            style={{ bottom: 0, marginLeft: 8 + depth * 16, pointerEvents: 'none' }}
          />
        )}
      </div>
    );
    if (hasChildren && !isCollapsed) {
      return (
        <div key={l.id}>
          {row}
          {l.children?.map((c) => renderItem(c, depth + 1))}
        </div>
      );
    }
    return row;
  };

  return (
    <Card className="p-0 gap-0 h-full min-h-0 flex flex-col" data-tour-id="layers-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="font-medium">图层</div>
        {uploadStatus && (
          <div className="text-xs text-muted-foreground animate-pulse">
            {uploadStatus}
          </div>
        )}
        {selectedLayer?.type === 'emitter' ? (
          <Tooltip disableHoverableContent={true}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                disabled={selectedLayer?.type === 'emitter'}
              >
                <Plus className="h-4 w-4 mr-1" /> 添加图层
              </Button>
            </TooltipTrigger>
            {selectedLayer?.type === 'emitter' &&
              <TooltipContent sideOffset={6}>
                发射器图层不支持子图层。
              </TooltipContent>
            }
          </Tooltip>
        ) :
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Plus className="h-4 w-4 mr-1" /> 添加图层
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addTextLayer()}>文本图层</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addShapeLayer("rect")}>基础图层</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addGradientLayer()}>渐变图层</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>图像图层…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                setTimeout(() => setVideoLayerIsOpen(true), 0);
              }}>视频图层…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addEmitterLayer()}>发射器图层</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addReplicatorLayer()}>复制器图层</DropdownMenuItem>
              {isGyro && (
                <DropdownMenuItem onSelect={() => addTransformLayer()}>变换图层</DropdownMenuItem>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    onSelect={() => addLiquidGlassLayer()}
                    className={!isChromium ? "text-amber-600 dark:text-amber-500" : ""}
                  >
                    {!isChromium && <AlertTriangle className="h-3.5 w-3.5" />}
                    液态玻璃图层
                  </DropdownMenuItem>
                </TooltipTrigger>
                {!isChromium && (
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="font-semibold mb-1">仅支持Chromium浏览器</p>
                    <p className="text-xs">
                      液态玻璃图层仅在基于Chromium的浏览器（Chrome、Edge、Opera）中工作。
                      在当前浏览器中将不可见该图层。
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
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
              setUploadStatus('GIF必须通过视频图层导入…');
              setTimeout(() => setUploadStatus(null), 2000);
            }
                        const imageFiles = files.filter(f => !(/image\/gif/i.test(f.type) || /\.gif$/i.test(f.name || '')));
                        if (imageFiles.length) setUploadStatus(imageFiles.length > 1 ? `正在上传 ${imageFiles.length} 个图像...` : '正在上传图像...');            try {
              for (const file of imageFiles) {
                try { await addImageLayerFromFile(file); } catch { }
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
              setUploadStatus(isGif ? '正在将GIF作为视频导入...' : '正在上传视频...');
              try {
                await addVideoLayerFromFile(file);
              } catch (err) {
                console.error('添加视频图层失败:', err);
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
              <span>根图层</span>
            </div>
            {!rootCollapsed && (
              <>
                {layers.length === 0 && (
                  <div className="py-2 text-muted-foreground" style={{ paddingLeft: 24 }}>暂无图层</div>
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
            {multiSelectedIds.length} 已选择
          </div>
          <div className="flex gap-2 items-center w-full">
            <Button
              variant="outline"
              size="icon"
              disabled={multiSelectedIds.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                for (const id of multiSelectedIds) {
                  try { duplicateLayer(id); } catch { }
                }
              }}
              className="h-8 w-8"
              title="复制图层"
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
                  try { deleteLayer(id); } catch { }
                }
                setMultiSelectedIds([]);
              }}
              className="h-8 w-8"
              title="删除图层"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => { setIsSelectMode(false); setMultiSelectedIds([]); }}
              className="flex-1 gap-1.5"
            >
              <Check className="h-4 w-4" />
              完成
            </Button>
          </div>
        </div>
      )}
      <VideoLayerDialog open={videoLayerIsOpen} setVideoLayerIsOpen={setVideoLayerIsOpen} />
    </Card>
  );
}
