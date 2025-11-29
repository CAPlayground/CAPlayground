"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";

export type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  latestVersion: string | null;
  leftWidth?: number;
  rightWidth?: number;
  statesHeight?: number;
  setLeftWidth?: (n: number) => void;
  setRightWidth?: (n: number) => void;
  setStatesHeight?: (n: number) => void;
  showLeft?: boolean;
  showRight?: boolean;
};

export function SettingsPanel({
  open,
  onClose,
  latestVersion,
  leftWidth,
  rightWidth,
  statesHeight,
  setLeftWidth,
  setRightWidth,
  setStatesHeight,
  showLeft,
  showRight,
}: SettingsPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [entering, setEntering] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [snapEdgesEnabled, setSnapEdgesEnabled] = useLocalStorage<boolean>("caplay_settings_snap_edges", true);
  const [snapLayersEnabled, setSnapLayersEnabled] = useLocalStorage<boolean>("caplay_settings_snap_layers", true);
  const [snapResizeEnabled, setSnapResizeEnabled] = useLocalStorage<boolean>("caplay_settings_snap_resize", true);
  const [snapRotationEnabled, setSnapRotationEnabled] = useLocalStorage<boolean>("caplay_settings_snap_rotation", true);
  const [SNAP_THRESHOLD, setSnapThreshold] = useLocalStorage<number>("caplay_settings_snap_threshold", 12);
  const [showAnchorPoint, setShowAnchorPoint] = useLocalStorage<boolean>("caplay_preview_anchor_point", false);
  const [autoClosePanels, setAutoClosePanels] = useLocalStorage<boolean>("caplay_settings_auto_close_panels", true);
  const [pinchZoomSensitivity, setPinchZoomSensitivity] = useLocalStorage<number>("caplay_settings_pinch_zoom_sensitivity", 1);
  const [showGeometryResize, setShowGeometryResize] = useLocalStorage<boolean>("caplay_settings_show_geometry_resize", false);
  const [showAlignButtons, setShowAlignButtons] = useLocalStorage<boolean>("caplay_settings_show_align_buttons", false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      setEntering(false);
      const id = requestAnimationFrame(() => setEntering(true));
      return () => cancelAnimationFrame(id);
    } else if (shouldRender) {
      setEntering(false);
      setIsClosing(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open, shouldRender]);

  useEffect(() => {
    if (!mounted) return;
    if (!shouldRender) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [shouldRender, mounted]);

  useEffect(() => {
    if (!shouldRender) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shouldRender, onClose]);

  if (!mounted || !shouldRender || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-[1000] bg-black/50 transition-opacity duration-300 ease-in-out",
          entering && !isClosing ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-[1001] bg-background border-l shadow-2xl",
          "w-full md:w-[500px] lg:w-[600px]",
          "transform transition-transform duration-300 ease-out",
          entering ? "translate-x-0" : "translate-x-full",
          "flex flex-col"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <h2 className="text-lg font-semibold">Editor Settings</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close settings" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Snapping */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Snapping</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-edges" className="text-sm">Snap to canvas edges</Label>
                <Switch id="snap-edges" checked={!!snapEdgesEnabled} onCheckedChange={(c) => setSnapEdgesEnabled(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-layers" className="text-sm">Snap to other layers</Label>
                <Switch id="snap-layers" checked={!!snapLayersEnabled} onCheckedChange={(c) => setSnapLayersEnabled(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-resize" className="text-sm">Snap when resizing</Label>
                <Switch id="snap-resize" checked={!!snapResizeEnabled} onCheckedChange={(c) => setSnapResizeEnabled(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-rotation" className="text-sm">Snap rotation (0°, 90°, 180°, 270°)</Label>
                <Switch id="snap-rotation" checked={!!snapRotationEnabled} onCheckedChange={(c) => setSnapRotationEnabled(!!c)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="snap-threshold" className="text-sm">Sensitivity</Label>
                  <Button variant="outline" size="sm" onClick={() => { setSnapThreshold(12) }}>Reset</Button>
                </div>
                <Slider id="snap-threshold" value={[SNAP_THRESHOLD]} min={3} max={25} onValueChange={([c]) => setSnapThreshold(c)} />
              </div>
            </div>
          </div>

          {/* Layer Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Layer Controls</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="show-geometry-resize" className="text-sm">Show geometry resize buttons</Label>
                <Switch id="show-geometry-resize" checked={!!showGeometryResize} onCheckedChange={(c) => setShowGeometryResize(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="show-align-buttons" className="text-sm">Show align buttons</Label>
                <Switch id="show-align-buttons" checked={!!showAlignButtons} onCheckedChange={(c) => setShowAlignButtons(!!c)} />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Preview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="show-anchor-point" className="text-sm">Show anchor point</Label>
                <Switch id="show-anchor-point" checked={!!showAnchorPoint} onCheckedChange={(c) => setShowAnchorPoint(!!c)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="pinch-zoom-sensitivity" className="text-sm">Pinch to zoom sensitivity</Label>
                  <Button variant="outline" size="sm" onClick={() => { setPinchZoomSensitivity(1) }}>Reset</Button>
                </div>
                <Slider id="pinch-zoom-sensitivity" value={[pinchZoomSensitivity]} min={0.5} max={2} step={0.1} onValueChange={([c]) => setPinchZoomSensitivity(c)} />
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>Undo</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Z</span></div>
              <div className="flex items-center justify-between"><span>Redo</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + Z</span></div>
              <div className="flex items-center justify-between"><span>Zoom In</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + +</span></div>
              <div className="flex items-center justify-between"><span>Zoom Out</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + -</span></div>
              <div className="flex items-center justify-between"><span>Reset Zoom</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + 0</span></div>
              <div className="flex items-center justify-between"><span>Export</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + E</span></div>
              <div className="flex items-center justify-between"><span>Pan</span><span className="font-mono text-muted-foreground text-xs">Shift + Drag or Middle Click</span></div>
              <div className="flex items-center justify-between"><span>Toggle Left Panel</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + L</span></div>
              <div className="flex items-center justify-between"><span>Toggle Right Panel</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + I</span></div>
              <div className="flex items-center justify-between"><span>Bring Forward</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + ]</span></div>
              <div className="flex items-center justify-between"><span>Send Backward</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + [</span></div>
              <div className="flex items-center justify-between"><span>Bring to Front</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + ]</span></div>
              <div className="flex items-center justify-between"><span>Send to Back</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + [</span></div>
              <div className="flex items-center justify-between"><span>Delete Layer</span><span className="font-mono text-muted-foreground text-xs">Delete</span></div>
            </div>
          </div>

          {/* Panels */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Panels</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="auto-close-panels" className="text-sm">Auto-close right panel on narrow screens</Label>
                <Switch id="auto-close-panels" checked={!!autoClosePanels} onCheckedChange={(c) => setAutoClosePanels(!!c)} />
              </div>
              <div className="flex items-center justify-between">
                <span>Left panel width</span>
                <span className="font-mono text-muted-foreground text-xs">{leftWidth ?? '—'} px</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Right panel width</span>
                <span className="font-mono text-muted-foreground text-xs">{rightWidth ?? '—'} px</span>
              </div>
              <div className="flex items-center justify-between">
                <span>States panel height</span>
                <span className="font-mono text-muted-foreground text-xs">{statesHeight ?? '—'} px</span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setLeftWidth?.(320);
                    setRightWidth?.(400);
                    setStatesHeight?.(350);
                  }}
                >
                  Reset to defaults
                </Button>
              </div>
            </div>
          </div>

          {/* Other */}
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('caplay:start-onboarding' as any));
                }
                onClose();
              }}
              disabled={!showLeft || !showRight}
            >
              Show onboarding
            </Button>
          </div>

          {/* Version info */}
          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground text-center">
              Version: {latestVersion ?? '...'}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}