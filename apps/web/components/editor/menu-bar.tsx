"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Trash2, Sun, Moon, Keyboard, PanelLeft, PanelRight, Settings as Gear, ArrowUpDown, Layers as LayersIcon, Check, X, MoreVertical, Eye, EyeOff, Undo2, Redo2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEditor } from "./editor-context";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, JSX } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProject, updateProject, deleteProject, isUsingOPFS } from "@/lib/storage";
import { SettingsPanel } from "./settings-panel";
import { ExportDialog } from "./ExportDialog";
 

interface ProjectMeta { id: string; name: string; width?: number; height?: number; createdAt?: string }

type MenuBarProps = {
  projectId: string;
  showLeft?: boolean;
  showRight?: boolean;
  toggleLeft?: () => void;
  toggleRight?: () => void;
  leftWidth?: number;
  rightWidth?: number;
  statesHeight?: number;
  setLeftWidth?: (n: number) => void;
  setRightWidth?: (n: number) => void;
  setStatesHeight?: (n: number) => void;
};

export function MenuBar({ projectId, showLeft = true, showRight = true, toggleLeft, toggleRight, leftWidth, rightWidth, statesHeight, setLeftWidth, setRightWidth, setStatesHeight }: MenuBarProps) {
  const router = useRouter();
  const { doc, undo, redo, setDoc, activeCA, setActiveCA, savingStatus, lastSavedAt, flushPersist } = useEditor();
  const { toast } = useToast();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showManualSave, setShowManualSave] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showBackground, setShowBackground] = useLocalStorage<boolean>("caplay_preview_show_background", true);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    if (doc?.meta.name) setName(doc.meta.name);
  }, [doc?.meta.name]);

  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const resp = await fetch('https://api.github.com/repos/CAPlayground/CAPlayground/tags?per_page=100', {
          headers: { 'Accept': 'application/vnd.github+json' },
        });
        if (!resp.ok) throw new Error(`Failed to fetch tags: ${resp.status}`);
        const data: Array<{ name: string }> = await resp.json();
        const normalize = (n: string) => (n.startsWith('v') ? n.slice(1) : n);
        const isSemverish = (n: string) => /^\d+(?:\.\d+){0,2}(?:-.+)?$/.test(n);
        const versions = data.map(t => normalize(t.name)).filter(isSemverish);
        if (versions.length === 0) return;
        const toNums = (v: string) => v.split('-')[0].split('.').map(x => parseInt(x, 10));
        versions.sort((a, b) => {
          const A = toNums(a), B = toNums(b);
          const len = Math.max(A.length, B.length);
          for (let i = 0; i < len; i++) {
            const ai = A[i] ?? 0; const bi = B[i] ?? 0;
            if (ai !== bi) return bi - ai;
          }
          return 0;
        });
        const top = versions[0];
        const topWithPrefix = data.find(t => normalize(t.name) === top)?.name ?? top;
        if (!aborted) setLatestVersion(topWithPrefix);
      } catch (e) {
        console.warn('Failed to load latest version', e);
      }
    })();
    return () => { aborted = true; };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) {
        if (e.key === 'Escape' && settingsOpen) {
          e.preventDefault();
          setSettingsOpen(false);
          return;
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.shiftKey && key === 'l') {
        e.preventDefault();
        toggleLeft?.();
      } else if (e.shiftKey && key === 'i') {
        e.preventDefault();
        toggleRight?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, toggleLeft, toggleRight, settingsOpen]);


  const performRename = async () => {
    if (!name.trim()) return;
    const proj = await getProject(projectId);
    if (proj) await updateProject({ ...proj, name: name.trim() });
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, meta: { ...prev.meta, name: name.trim() } };
    });
    setRenameOpen(false);
  };

  const performDelete = async () => {
    await deleteProject(projectId);
    router.push("/projects");
  };

  return (
    <div className="w-full h-12 flex items-center justify-between px-3 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <div className="border rounded-md p-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{doc?.meta.name ?? "Project"}</span>
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={async () => { await flushPersist(); router.push('/projects'); }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        {/* Undo/Redo controls */}
        <div className="border rounded-md p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            aria-label="Undo"
            title={`${typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Z`}
            onClick={() => undo()}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            aria-label="Redo"
            title={`${typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + Z`}
            onClick={() => redo()}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        {/* Saving status + storage badge */}
        <div onMouseEnter={() => setShowManualSave(true)} onMouseLeave={() => setShowManualSave(false)}>
          {showManualSave ? (
            <button
              className="text-xs px-2 py-0.5 rounded-full border border-muted-foreground/50 text-muted-foreground cursor-pointer hover:border-muted-foreground transition-colors"
              onClick={async () => { await flushPersist(); setShowManualSave(false); }}
              title="Save now"
            >
              Manual Save
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* Mobile: dot indicator, Desktop: text */}
              <div
                className="flex items-center gap-1.5"
                aria-live="polite"
                title={`${savingStatus === 'saving' ? 'Saving…' : savingStatus === 'saved' ? 'Saved' : 'Idle'}${lastSavedAt ? ` - Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    savingStatus === 'saving'
                      ? 'bg-amber-500 animate-pulse'
                      : savingStatus === 'saved'
                      ? 'bg-emerald-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span
                  className={`hidden sm:inline text-xs ${
                    savingStatus === 'saving'
                      ? 'text-amber-700 dark:text-amber-400'
                      : savingStatus === 'saved'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {savingStatus === 'saving' ? 'Saving…' : savingStatus === 'saved' ? 'Saved' : 'Idle'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* switch between ca files */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="border rounded-md p-0.5">
            {doc?.meta.gyroEnabled ? (
              <Button
                variant="ghost"
                className="h-8 px-2 gap-2 cursor-default"
                disabled
              >
                <span className="text-sm">Wallpaper</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 gap-2"
                    aria-label={`Active CA: ${activeCA === 'floating' ? 'Floating' : 'Background'}`}
                    aria-expanded={false}
                    role="button"
                  >
                    <span className="text-sm">{activeCA === 'floating' ? 'Floating' : 'Background'}</span>
                    <ArrowUpDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 p-2">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">Choose Active CA</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activeCA === 'floating' && (
                  <>
                    <div className="px-2 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="show-background" className="text-sm">Show background</Label>
                        <Switch id="show-background" checked={showBackground} onCheckedChange={setShowBackground} />
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
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1 border rounded-md p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title={showLeft ? "Hide left panel" : "Show left panel"}
            aria-label={showLeft ? "Hide left panel" : "Show left panel"}
            onClick={() => toggleLeft?.()}
          >
            <PanelLeft className={`h-4 w-4 ${showLeft ? '' : 'opacity-50'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title={showRight ? "Hide right panel" : "Show right panel"}
            aria-label={showRight ? "Hide right panel" : "Show right panel"}
            onClick={() => toggleRight?.()}
          >
            <PanelRight className={`h-4 w-4 ${showRight ? '' : 'opacity-50'}`} />
          </Button>
        </div>

        <div className="border rounded-md p-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 p-0"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
        {/* Settings button */}
        <div className="border rounded-md p-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 p-0" 
            aria-label="Settings" 
            data-tour-id="settings-button"
            onClick={() => setSettingsOpen(true)}
          >
            <Gear className="h-4 w-4" />
          </Button>
        </div>
        <ExportDialog />
      </div>

      {/* shortcuts modal */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Undo</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Z</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Redo</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + Z</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Zoom in</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + +</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Zoom out</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + -</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Re-center</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + 0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Export</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + E</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Zoom with scroll</span>
              <span className="font-mono text-muted-foreground">Shift + Scroll</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pan canvas</span>
              <span className="font-mono text-muted-foreground">Middle Click + Drag</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pan canvas (alt)</span>
              <span className="font-mono text-muted-foreground">Shift + Drag</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle left panel</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + L</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle right panel</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + I</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShortcutsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Update the name of your project.</DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') performRename();
              if (e.key === 'Escape') setRenameOpen(false);
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={performRename} disabled={!name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and its editor data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={performDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        latestVersion={latestVersion}
        leftWidth={leftWidth}
        rightWidth={rightWidth}
        statesHeight={statesHeight}
        setLeftWidth={setLeftWidth}
        setRightWidth={setRightWidth}
        setStatesHeight={setStatesHeight}
        showLeft={showLeft}
        showRight={showRight}
      />
    </div>
  );
}
