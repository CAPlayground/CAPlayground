"use client";

import { ChevronDown, ChevronUp, ArrowUpDown, Layers as LayersIcon, Check, Plus, X, CircleDot } from "lucide-react";
import { useEditor } from "./editor-context";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRef, useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type MobileBottomBarProps = {
  mobileView: 'canvas' | 'panels';
  setMobileView: (view: 'canvas' | 'panels') => void;
};

export function MobileBottomBar({ mobileView, setMobileView }: MobileBottomBarProps) {
  const { 
    doc, 
    activeCA, 
    setActiveCA, 
    addTextLayer,
    addImageLayerFromFile,
    addShapeLayer,
    addGradientLayer,
    addVideoLayerFromFile,
    addEmitterLayer,
    addTransformLayer,
    setActiveState,
  } = useEditor();
  const isGyro = doc?.meta.gyroEnabled ?? false;
  const [showBackground, setShowBackground] = useLocalStorage<boolean>("caplay_preview_show_background", true);
  const [statesOpen, setStatesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const states = current?.states ?? [];
  const activeState = current?.activeState || 'Base State';

  const [showStates, setShowStates] = useState(true);
  const [showAddLayer, setShowAddLayer] = useState(true);

  useEffect(() => {
    const checkWidth = () => {
      if (!containerRef.current) return;
      
      const SIDE_MARGIN = 16;
      const GAP = 12;
      const BUTTON_TOGGLE = 105;
      const BUTTON_CA = 130;
      const BUTTON_ICON = 40;
      
      const screenWidth = window.innerWidth;
      const availableWidth = screenWidth - (SIDE_MARGIN * 2);
      const width4Buttons = BUTTON_TOGGLE + GAP + BUTTON_CA + GAP + BUTTON_ICON + GAP + BUTTON_ICON;
      const width3Buttons = BUTTON_TOGGLE + GAP + BUTTON_CA + GAP + BUTTON_ICON;
      const width2Buttons = BUTTON_TOGGLE + GAP + BUTTON_CA;
      
      if (availableWidth >= width4Buttons) {
        setShowStates(true);
        setShowAddLayer(true);
      } else if (availableWidth >= width3Buttons) {
        setShowStates(false);
        setShowAddLayer(true);
      } else if (availableWidth >= width2Buttons) {
        setShowStates(false);
        setShowAddLayer(false);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-3 py-3 bg-background/95 backdrop-blur-sm border-t shadow-lg z-50" 
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background shadow-sm hover:bg-accent transition-colors touch-manipulation"
        onClick={() => setMobileView(mobileView === 'canvas' ? 'panels' : 'canvas')}
      >
        {mobileView === 'canvas' ? (
          <>
            <ChevronUp className="h-4 w-4" /> Panels
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" /> Canvas
          </>
        )}
      </button>

      {!isGyro && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background shadow-sm hover:bg-accent transition-colors touch-manipulation"
              aria-label={`激活的CA: ${activeCA === 'floating' ? '浮动' : '背景'}`}
              aria-expanded={false}
              role="button"
            >
              <span className="text-sm">{activeCA === 'floating' ? '浮动' : '背景'}</span>
              <ArrowUpDown className="h-4 w-4 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-80 p-2 mb-2">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">选择激活的CA</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activeCA === 'floating' && (
              <>
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="show-background-mobile" className="text-sm">Show background</Label>
                    <Switch id="show-background-mobile" checked={showBackground} onCheckedChange={setShowBackground} />
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => { setActiveCA('background'); }}
                className={`w-full justify-start text-left py-6 ${activeCA==='background' ? 'border-primary/50' : ''}`}
                role="menuitemradio"
                aria-checked={activeCA==='background'}
              >
                <div className="flex items-center gap-3">
                  <LayersIcon className="h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div>Background</div>
                    <div className="text-xs text-muted-foreground">Appears behind the clock.</div>
                  </div>
                  {activeCA==='background' && <Check className="h-4 w-4" />}
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => { setActiveCA('floating'); }}
                className={`w-full justify-start text-left py-6 ${activeCA==='floating' ? 'border-primary/50' : ''}`}
                role="menuitemradio"
                aria-checked={activeCA==='floating'}
              >
                <div className="flex items-center gap-3">
                  <LayersIcon className="h-4 w-4" />
                  <div className="flex-1 text-left">
                    <div>Floating</div>
                    <div className="text-xs text-muted-foreground">Appears over the clock.</div>
                  </div>
                  {activeCA==='floating' && <Check className="h-4 w-4" />}
                </div>
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isGyro && (
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background shadow-sm cursor-default opacity-60"
          disabled
        >
          <span className="text-sm">Wallpaper</span>
        </button>
      )}

      {showAddLayer && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border bg-background shadow-sm hover:bg-accent transition-colors touch-manipulation"
              aria-label="添加图层"
            >
              <Plus className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="mb-2">
            <DropdownMenuItem onSelect={() => addTextLayer()}>文本图层</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addShapeLayer("rect")}>基础图层</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addGradientLayer()}>渐变图层</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>图像图层…</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => videoInputRef.current?.click()}>视频图层…</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addEmitterLayer()}>发射器图层</DropdownMenuItem>
            {isGyro && (
              <DropdownMenuItem onSelect={() => addTransformLayer()}>变换图层</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {showStates && (
        <DropdownMenu open={statesOpen} onOpenChange={setStatesOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border bg-background shadow-sm hover:bg-accent transition-colors touch-manipulation"
              aria-label="状态"
            >
              {statesOpen ? <X className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center" 
            side="top" 
            className="w-48 mb-2"
            onEscapeKeyDown={() => setStatesOpen(false)}
          >
            <DropdownMenuLabel className="text-xs font-medium">States</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault(); 
                setActiveState('Base State');
              }}
              className={`cursor-pointer ${activeState === 'Base State' ? 'bg-accent' : ''}`}
            >
              Base State
            </DropdownMenuItem>
                        {states.includes('Locked') && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setActiveState('Locked');
                            }}
                            className={`cursor-pointer ${activeState === 'Locked' ? 'bg-accent' : ''}`}
                          >
                            锁定
                          </DropdownMenuItem>
                        )}
                        {states.includes('Unlock') && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setActiveState('Unlock');
                            }}
                            className={`cursor-pointer ${activeState === 'Unlock' ? 'bg-accent' : ''}`}
                          >
                            解锁
                          </DropdownMenuItem>
                        )}
                        {states.includes('Sleep') && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setActiveState('Sleep');
                            }}
                            className={`cursor-pointer ${activeState === 'Sleep' ? 'bg-accent' : ''}`}
                          >
                            休眠
                          </DropdownMenuItem>
                        )}          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp,image/svg+xml"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          const imageFiles = files.filter(f => !(/image\/gif/i.test(f.type) || /\.gif$/i.test(f.name || '')));
          for (const file of imageFiles) {
            try { await addImageLayerFromFile(file); } catch {}
          }
          e.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-m4v,image/gif"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try { await addVideoLayerFromFile(file); } catch {}
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
