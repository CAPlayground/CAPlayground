"use client";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useParams, useRouter } from "next/navigation";
import { EditorProvider } from "@/components/editor/editor-context";
import { MenuBar } from "@/components/editor/menu-bar";
import { LayersPanel } from "@/components/editor/layers-panel";
import { StatesPanel } from "@/components/editor/states-panel";
import { Inspector } from "@/components/editor/inspector";
import { CanvasPreview } from "@/components/editor/canvas-preview";
import { MobileBottomBar } from "@/components/editor/mobile-bottom-bar";
import EditorOnboarding from "@/components/editor/onboarding";
import { BrowserWarning } from "@/components/editor/browser-warning";
import { getProject } from "@/lib/storage";
import { TimelineProvider } from "@/context/TimelineContext";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id;
  const [meta, setMeta] = useState<{ id: string; name: string; width: number; height: number; background?: string } | null>(null);
  const [leftWidth, setLeftWidth] = useLocalStorage<number>("caplay_panel_left_width", 320);
  const [rightWidth, setRightWidth] = useLocalStorage<number>("caplay_panel_right_width", 400);
  const [statesHeight, setStatesHeight] = useLocalStorage<number>("caplay_panel_states_height", 350);
  const [autoClosePanels] = useLocalStorage<boolean>("caplay_settings_auto_close_panels", true);
  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mobile portrait detection
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px) and (orientation: portrait)');
    const apply = () => setIsMobilePortrait(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const [isWideDesktop, setIsWideDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1250px)');
    const apply = () => {
      const matches = mq.matches;
      setIsWideDesktop(matches);

      if (autoClosePanels) {
        if (matches) {
          setShowLeft(true);
          setShowRight(true);
        } else {
          setShowRight(false);
        }
      } else if (matches) {
        setShowLeft(true);
        setShowRight(true);
      }
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [autoClosePanels]);

  type PanelKey = 'layers_states' | 'inspector';
  const [mobilePanelScreen, setMobilePanelScreen] = useState<PanelKey>('layers_states');
  const [mobileView, setMobileView] = useState<'canvas' | 'panels'>('canvas');

  useEffect(() => {
    const hasOpenDialog = () => document.querySelector('[role="dialog"]') !== null;

    if (isMobilePortrait && mobileView === 'canvas' && !hasOpenDialog()) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    const observer = new MutationObserver(() => {
      if (isMobilePortrait && mobileView === 'canvas') {
        if (hasOpenDialog()) {
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.height = '';
        } else {
          document.body.style.overflow = 'hidden';
          document.body.style.position = 'fixed';
          document.body.style.width = '100%';
          document.body.style.height = '100%';
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isMobilePortrait, mobileView]);
  const mobileContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const p = await getProject(projectId);
        if (!p) {
          router.replace("/projects");
          return;
        }
        setMeta({ id: p.id, name: p.name, width: p.width ?? 390, height: p.height ?? 844 });
      } catch {
        router.replace("/projects");
      }
    })();
  }, [projectId]);

  if (!projectId || !meta) return null;

  return (
    <EditorProvider projectId={projectId} initialMeta={meta}>
      <TimelineProvider>
        <BrowserWarning />
        <div className="flex flex-col h-[100dvh] md:h-[calc(100vh)]" ref={containerRef}>
          <MenuBar
            projectId={projectId}
            showLeft={showLeft}
            showRight={showRight}
            toggleLeft={() => setShowLeft((v) => {
              const nv = !v;
              if (!isWideDesktop && nv) setShowRight(false);
              return nv;
            })}
            toggleRight={() => setShowRight((v) => {
              const nv = !v;
              if (!isWideDesktop && nv) setShowLeft(false);
              return nv;
            })}
            leftWidth={leftWidth}
            rightWidth={rightWidth}
            setLeftWidth={setLeftWidth}
            setRightWidth={setRightWidth}
            setStatesHeight={setStatesHeight}
          />
          <div className="flex-1 px-4 py-4 overflow-hidden">
            {isMobilePortrait ? (
              // Mobile portrait layout -  toggle between full canvas or full panel screen
              <div className="h-full w-full flex flex-col" ref={mobileContainerRef}>
                {mobileView === 'canvas' ? (
                  <div className="min-h-0 flex-1 pb-16">
                    <CanvasPreview />
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 overflow-hidden pb-16">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <button
                        className={`px-3 py-1 rounded text-sm border ${mobilePanelScreen === 'layers_states' ? 'bg-accent text-accent-foreground' : 'bg-background'}`}
                        onClick={() => setMobilePanelScreen('layers_states')}
                      >Layers/States</button>
                      <button
                        className={`px-3 py-1 rounded text-sm border ${mobilePanelScreen === 'inspector' ? 'bg-accent text-accent-foreground' : 'bg-background'}`}
                        onClick={() => setMobilePanelScreen('inspector')}
                      >Inspector</button>
                    </div>
                    <div className="h-full overflow-auto">
                      {mobilePanelScreen === 'layers_states' ? (
                        <div className="flex flex-col gap-3 min-h-0">
                          <div className="min-h-0">
                            <LayersPanel />
                          </div>
                          <div className="min-h-0">
                            <StatesPanel />
                          </div>
                        </div>
                      ) : (
                        <Inspector />
                      )}
                    </div>
                  </div>
                )}
                <MobileBottomBar mobileView={mobileView} setMobileView={setMobileView} />
              </div>
            ) : (
              // Desktop/tablet layout: original side panels
              <div className="h-full w-full flex gap-0">
                {showLeft && (
                  <>
                    <div className="min-h-0 flex-shrink-0" style={{ width: leftWidth }}>
                      <div ref={leftPaneRef} className="h-full min-h-0 flex flex-col pr-1">
                        <div className="flex-1 min-h-0 overflow-hidden" style={{ flex: '1 1 auto' }}>
                          <LayersPanel />
                        </div>
                        <div
                          className="relative w-full h-2 cursor-row-resize flex-shrink-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const startY = e.clientY;
                            const start = statesHeight;
                            const RESIZER = 2;
                            const MIN_TOP = 140;
                            const MIN_BOTTOM = 120;
                            const paneEl = leftPaneRef.current;
                            const total = paneEl ? paneEl.getBoundingClientRect().height : 0;
                            const onMove = (ev: MouseEvent) => {
                              const dy = ev.clientY - startY;
                              let next = start - dy;
                              if (total > 0) {
                                const maxBottom = Math.max(MIN_BOTTOM, total - MIN_TOP - RESIZER);
                                next = Math.max(MIN_BOTTOM, Math.min(maxBottom, next));
                              } else {
                                next = Math.max(MIN_BOTTOM, next);
                              }
                              setStatesHeight(next);
                            };
                            const onUp = () => {
                              window.removeEventListener('mousemove', onMove);
                              window.removeEventListener('mouseup', onUp);
                            };
                            window.addEventListener('mousemove', onMove);
                            window.addEventListener('mouseup', onUp);
                          }}
                          aria-label="Resize layers/states panels"
                        />
                        <div className="min-h-[120px] overflow-auto" style={{ flex: `0 0 ${statesHeight}px` }}>
                          <StatesPanel />
                        </div>
                      </div>
                    </div>
                    <div
                      className="relative w-2 mx-0 h-full self-stretch cursor-col-resize flex-shrink-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const start = leftWidth;
                        const onMove = (ev: MouseEvent) => {
                          const dx = ev.clientX - startX;
                          const next = Math.max(240, Math.min(560, start + dx));
                          setLeftWidth(next);
                        };
                        const onUp = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      }}
                      aria-label="Resize left column"
                    />
                  </>
                )}

                <div className="min-h-0 flex-1">
                  <CanvasPreview />
                </div>

                {showRight && (
                  <>
                    <div
                      className="relative w-2 mx-0 h-full self-stretch cursor-col-resize flex-shrink-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const start = rightWidth;
                        const onMove = (ev: MouseEvent) => {
                          const dx = startX - ev.clientX;
                          const next = Math.max(260, Math.min(560, start + dx));
                          setRightWidth(next);
                        };
                        const onUp = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      }}
                      aria-label="Resize right column"
                    />

                    <div className="min-h-0 flex-shrink-0" style={{ width: rightWidth }}>
                      <Inspector />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Onboarding overlay (portal) */}
          <EditorOnboarding showLeft={showLeft} showRight={showRight} />
        </div>
      </TimelineProvider>
    </EditorProvider>
  );
}
