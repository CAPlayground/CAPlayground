"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type Step = {
  id: string;
  selector: string;
  title: string;
  body: string;
  placement?: "auto" | "top" | "bottom" | "left" | "right";
};

function getRect(el: Element | null) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!Number.isFinite(r.width) || !Number.isFinite(r.height)) return null;
  return r;
}

function isInViewport(r: DOMRect | null) {
  if (!r) return false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
}

export function EditorOnboarding({ showLeft, showRight }: { showLeft: boolean; showRight: boolean }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);

  const steps: Step[] = useMemo(() => [
    {
      id: "layers",
      selector: '[data-tour-id="layers-panel"]',
      title: "Layers",
      body: "Manage the layers in your wallpaper. Click a layer to select, duplicate or delete.",
      placement: "right",
    },
    {
      id: "states",
      selector: '[data-tour-id="states-panel"]',
      title: "States",
              body: "在壁纸的不同状态之间切换，例如当手机处于锁定、解锁或休眠状态时。您可以在此处制作状态转换。",      placement: "right",
    },
    {
      id: "canvas",
      selector: '[data-tour-id="canvas"]',
      title: "Canvas",
      body: "Drag, resize, and preview your layers. Use ⌘/+ / ⌘/- to zoom, Shift+Drag to pan.",
      placement: "bottom",
    },
    {
      id: "inspector",
      selector: '[data-tour-id="inspector"]',
      title: "Inspector",
      body: "Edit geometry, compositing, content, text, images, and animations for the selected layer.",
      placement: "left",
    },
    {
      id: "settings",
      selector: '[data-tour-id="settings-button"]',
      title: "Settings",
      body: "Configure snapping behavior, see keyboard shortcuts, and reset this onboarding to view it again.",
      placement: "bottom",
    },
  ], []);

  const currentAnchor = useMemo(() => {
    let i = idx;
    for (let guard = 0; guard < steps.length; guard++) {
      const step = steps[i];
      if (!step) break;
      if (step.id === "layers" || step.id === "states") {
        if (!showLeft) { i = (i + 1) % steps.length; continue; }
      }
      if (step.id === "inspector") {
        if (!showRight) { i = (i + 1) % steps.length; continue; }
      }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      const r = getRect(el);
      if (el && isInViewport(r)) return { i, el, r };
      i = (i + 1) % steps.length;
    }
    return null;
  }, [idx, steps, showLeft, showRight]);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const el = currentAnchor?.el ?? null;
      const r = getRect(el);
      setRect(r);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const onResize = () => setRect((prev) => (prev ? new DOMRect(prev.x, prev.y, prev.width, prev.height) : prev));
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, currentAnchor?.el]);

  useEffect(() => {
    setReady(true);
    if (showLeft && showRight) {
      const seen = typeof window !== 'undefined' ? localStorage.getItem('caplay_onboarding_seen') === '1' : false;
      if (!seen) {
        setTimeout(() => setOpen(true), 150);
      }
    } else {
      setOpen(false);
    }
    
    const onStart = () => {
      if (showLeft && showRight) {
        setIdx(0);
        setOpen(true);
      }
    };
    window.addEventListener('caplay:start-onboarding' as any, onStart);
    return () => window.removeEventListener('caplay:start-onboarding' as any, onStart);
  }, [showLeft, showRight]);

  const finish = () => {
    try { localStorage.setItem('caplay_onboarding_seen', '1'); } catch {}
    setOpen(false);
  };
  const goNext = () => setIdx((v) => {
    const next = v + 1;
    if (next >= steps.length) { finish(); return v; }
    return next;
  });
  const goPrev = () => setIdx((v) => Math.max(0, v - 1));

  if (!ready || !open) return null;

  const step = steps[currentAnchor?.i ?? idx] ?? steps[0];
  const isLast = (currentAnchor?.i ?? idx) === steps.length - 1;

  const r = currentAnchor?.r ?? rect;
  const pad = 8;
  let tipX = 20;
  let tipY = 20;
  let arrow: "top" | "bottom" | "left" | "right" = "top";
  if (r) {
    const place = step.placement || "auto";
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (place === "bottom" || (place === "auto" && r.top < vh / 2)) {
      tipX = Math.min(vw - 320 - pad, Math.max(pad, r.left));
      tipY = Math.min(vh - 160 - pad, r.bottom + pad);
      arrow = "top";
    } else if (place === "top" || (place === "auto" && r.top >= vh / 2)) {
      tipX = Math.min(vw - 320 - pad, Math.max(pad, r.left));
      tipY = Math.max(pad, r.top - 160 - pad);
      arrow = "bottom";
    } else if (place === "left") {
      tipX = Math.max(pad, r.left - 320 - pad);
      tipY = Math.max(pad, Math.min(vh - 160 - pad, r.top));
      arrow = "right";
    } else if (place === "right") {
      tipX = Math.min(vw - 320 - pad, r.right + pad);
      tipY = Math.max(pad, Math.min(vh - 160 - pad, r.top));
      arrow = "left";
    }
  }

  const overlay = (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      {/* Highlight box */}
      {r && (
        <div
          className="absolute rounded-md ring-2 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{ left: r.left - 4, top: r.top - 4, width: r.width + 8, height: r.height + 8 }}
        />
      )}
      {/* Tooltip */}
      <div
        className="absolute w-[320px] bg-background text-foreground border rounded-md p-3 shadow-xl pointer-events-auto"
        style={{ left: tipX, top: tipY }}
      >
        <div className="text-sm font-medium mb-1">{step.title}</div>
        <div className="text-xs text-muted-foreground mb-3">{step.body}</div>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goPrev}>Back</Button>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={finish}>Skip</Button>
            )}
            {isLast && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { if (typeof window !== 'undefined') window.open('https://docs.enkei64.xyz', '_blank', 'noopener,noreferrer'); }}
              >
                Documentation
              </Button>
            )}
            <Button size="sm" onClick={isLast ? finish : goNext}>{isLast ? 'Done' : 'Next'}</Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default EditorOnboarding;