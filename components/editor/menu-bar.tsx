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
import { ArrowLeft, Pencil, Trash2, Sun, Moon, Keyboard, PanelLeft, PanelRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useEditor } from "./editor-context";
import { packCA } from "@/lib/ca/ca-file";
import type { AnyLayer, GroupLayer } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, JSX } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import JSZip from "jszip";

interface ProjectMeta { id: string; name: string; width?: number; height?: number; createdAt?: string }

type MenuBarProps = {
  projectId: string;
  showLeft?: boolean;
  showRight?: boolean;
  toggleLeft?: () => void;
  toggleRight?: () => void;
};

export function MenuBar({ projectId, showLeft = true, showRight = true, toggleLeft, toggleRight }: MenuBarProps) {
  const router = useRouter();
  const { doc, undo, redo, setDoc } = useEditor();
  const [projects, setProjects] = useLocalStorage<ProjectMeta[]>("caplayground-projects", []);
  const { toast } = useToast();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingTendies, setExportingTendies] = useState(false);

  useEffect(() => {
    if (doc?.meta.name) setName(doc.meta.name);
  }, [doc?.meta.name]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'e') {
        e.preventDefault();
        setExportOpen(true);
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
  }, [undo, redo, toggleLeft, toggleRight]);

  const exportCA = async () => {
    try {
      if (!doc) return;
      const nameSafe = (doc.meta.name || 'Project').replace(/[^a-z0-9\-_]+/gi, '-');
      const rewriteLayer = (layer: AnyLayer): AnyLayer => {
        if (layer.type === 'group') {
          const g = layer as GroupLayer;
          return { ...g, children: (g.children || []).map(rewriteLayer) } as AnyLayer;
        }
        if (layer.type === 'image') {
          const asset = (doc.assets || {})[(layer as any).id];
          if (asset) {
            return { ...layer, src: `assets/${asset.filename}` } as AnyLayer;
          }
        }
        return { ...layer } as AnyLayer;
      };

      const root: GroupLayer = {
        id: doc.meta.id,
        name: doc.meta.name || 'Project',
        type: 'group',
        position: { x: Math.round((doc.meta.width || 0) / 2), y: Math.round((doc.meta.height || 0) / 2) },
        size: { w: doc.meta.width || 0, h: doc.meta.height || 0 },
        backgroundColor: doc.meta.background,
        children: ((doc.layers as AnyLayer[]) || []).map(rewriteLayer),
      };

      const assets: Record<string, { path: string; data: Blob | ArrayBuffer | string }> = {};
      const dataURLToBlob = (dataURL: string): Blob => {
        const [meta, data] = dataURL.split(',');
        const isBase64 = /;base64$/i.test(meta);
        const mimeMatch = meta.match(/^data:([^;]+)(;base64)?$/i);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        if (isBase64) {
          const byteString = atob(data);
          const ia = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          return new Blob([ia], { type: mime });
        } else {
          return new Blob([decodeURIComponent(data)], { type: mime });
        }
      };

      if (doc.assets) {
        for (const [layerId, info] of Object.entries(doc.assets)) {
          try {
            const blob = info.dataURL.startsWith('data:') ? dataURLToBlob(info.dataURL) : new Blob();
            assets[info.filename] = { path: `assets/${info.filename}`, data: blob };
          } catch {}
        }
      }

      const caBlob = await packCA({
        project: {
          id: doc.meta.id,
          name: doc.meta.name,
          width: doc.meta.width,
          height: doc.meta.height,
          background: doc.meta.background,
        },
        root,
        assets,
        states: (doc as any).states,
        stateOverrides: (doc as any).stateOverrides,
        stateTransitions: (doc as any).stateTransitions,
      });
      const caZip = new JSZip();
      await caZip.loadAsync(caBlob);
      const outputZip = new JSZip();
      const folderName = `${nameSafe}.ca`;
      for (const [relativePath, file] of Object.entries(caZip.files)) {
        if (!file.dir) {
          const content = await file.async('uint8array');
          outputZip.file(`${folderName}/${relativePath}`, content);
        }
      }
      
      const finalZipBlob = await outputZip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(finalZipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameSafe}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
      toast({
        title: "Export failed",
        description: "Failed to export .ca file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportTendies = async () => {
    try {
      setExportingTendies(true);
      if (!doc) return;
      
      const nameSafe = (doc.meta.name || 'Project').replace(/[^a-z0-9\-_]+/gi, '-');
      const rewriteLayer = (layer: AnyLayer): AnyLayer => {
        if (layer.type === 'group') {
          const g = layer as GroupLayer;
          return { ...g, children: (g.children || []).map(rewriteLayer) } as AnyLayer;
        }
        if (layer.type === 'image') {
          const asset = (doc.assets || {})[(layer as any).id];
          if (asset) {
            return { ...layer, src: `assets/${asset.filename}` } as AnyLayer;
          }
        }
        return { ...layer } as AnyLayer;
      };

      const root: GroupLayer = {
        id: doc.meta.id,
        name: doc.meta.name || 'Project',
        type: 'group',
        position: { x: Math.round((doc.meta.width || 0) / 2), y: Math.round((doc.meta.height || 0) / 2) },
        size: { w: doc.meta.width || 0, h: doc.meta.height || 0 },
        backgroundColor: doc.meta.background,
        children: ((doc.layers as AnyLayer[]) || []).map(rewriteLayer),
      };

      const assets: Record<string, { path: string; data: Blob | ArrayBuffer | string }> = {};
      const dataURLToBlob = (dataURL: string): Blob => {
        const [meta, data] = dataURL.split(',');
        const isBase64 = /;base64$/i.test(meta);
        const mimeMatch = meta.match(/^data:([^;]+)(;base64)?$/i);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        if (isBase64) {
          const byteString = atob(data);
          const ia = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          return new Blob([ia], { type: mime });
        } else {
          return new Blob([decodeURIComponent(data)], { type: mime });
        }
      };

      if (doc.assets) {
        for (const [layerId, info] of Object.entries(doc.assets)) {
          try {
            const blob = info.dataURL.startsWith('data:') ? dataURLToBlob(info.dataURL) : new Blob();
            assets[info.filename] = { path: `assets/${info.filename}`, data: blob };
          } catch {}
        }
      }

      const caBlob = await packCA({
        project: {
          id: doc.meta.id,
          name: doc.meta.name,
          width: doc.meta.width,
          height: doc.meta.height,
          background: doc.meta.background,
        },
        root,
        assets,
        states: (doc as any).states,
        stateOverrides: (doc as any).stateOverrides,
        stateTransitions: (doc as any).stateTransitions,
      });

      const templateResponse = await fetch('/api/templates/tendies', {
        method: 'GET',
        headers: {
          'Accept': 'application/zip',
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (!templateResponse.ok) {
        throw new Error(`Failed to fetch tendies template: ${templateResponse.status} ${templateResponse.statusText}`);
      }
      
      const templateArrayBuffer = await templateResponse.arrayBuffer();
      
      if (templateArrayBuffer.byteLength === 0) {
        throw new Error('Error with length of tendies file');
      }

      const templateZip = new JSZip();
      await templateZip.loadAsync(templateArrayBuffer);

      const outputZip = new JSZip();

      for (const [relativePath, file] of Object.entries(templateZip.files)) {
        if (!file.dir) {
          const content = await file.async('uint8array');
          outputZip.file(relativePath, content);
        }
      }

             // Extract CA file contents and place them inside the CA folder
       const caZip = new JSZip();
       await caZip.loadAsync(await caBlob.arrayBuffer());
       
       const caFolderPath = `descriptors/09E9B685-7456-4856-9C10-47DF26B76C33/versions/1/contents/7400.WWDC_2022-390w-844h@3x~iphone.wallpaper/7400.WWDC_2022_Floating-390w-844h@3x~iphone.ca`;
       
       for (const [relativePath, file] of Object.entries(caZip.files)) {
         if (!file.dir) {
           const content = await file.async('uint8array');
           const fullPath = `${caFolderPath}/${relativePath}`;
           outputZip.file(fullPath, content);
         }
       }

      const finalZipBlob = await outputZip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(finalZipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameSafe}.tendies`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: `Tendies file "${nameSafe}.tendies" has been downloaded.`,
      });
      
      setExportOpen(false);
    } catch (e) {
      console.error('Tendies export failed', e);
      toast({
        title: "Export failed",
        description: "Failed to export tendies file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportingTendies(false);
    }
  };

  const performRename = () => {
    if (!name.trim()) return;
    const next = (projects ?? []).map((p) => (p.id === projectId ? { ...p, name: name.trim() } : p));
    setProjects(next);
    const key = `caplayground-project:${projectId}`;
    try {
      const current = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (current) {
        const parsed = JSON.parse(current);
        parsed.meta.name = name.trim();
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch {}
    
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, meta: { ...prev.meta, name: name.trim() } };
    });
    setRenameOpen(false);
  };

  const performDelete = () => {
    const next = (projects ?? []).filter((p) => p.id !== projectId);
    setProjects(next);
    try { localStorage.removeItem(`caplayground-project:${projectId}`); } catch {}
    router.push("/projects");
  };

  return (
    <div className="w-full h-12 flex items-center justify-between px-3 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 border border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {doc?.meta.name ?? "Project"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/projects">
              <DropdownMenuItem className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border rounded-md p-0.5">
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
        <div className="border rounded-md p-0.5">
          <Button
            variant="ghost"
            className="h-8 px-2"
            onClick={() => setShortcutsOpen(true)}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        </div>
        <div>
          <Button variant="secondary" disabled={!doc} onClick={() => setExportOpen(true)}>Export</Button>
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export</DialogTitle>
                <DialogDescription>Select a format to export your project.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => { exportCA(); setExportOpen(false); }}
                  disabled={!doc}
                  className="w-full justify-start text-left py-10"
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span>Export .ca file</span>
                    <span className="text-xs text-muted-foreground">Download a .ca archive you can re-import later.</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { exportTendies(); }}
                  disabled={!doc || exportingTendies}
                  className="w-full justify-start text-left py-10"
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span>Export Tendies file</span>
                    <span className="text-xs text-muted-foreground">
                      {exportingTendies ? 'Creating tendies file...' : 'Create a tendies wallpaper file with your animation.'}
                    </span>
                  </div>
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExportOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
    </div>
  );
}
