"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit3, Plus, Folder, ArrowLeft, Check, Upload, ArrowRight, SlidersHorizontal, HardDrive, Cloud, MoreVertical, Smartphone, Grid3x3, List } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getDevicesByCategory } from "@/lib/devices";
type DeviceSpec = { name: string; width: number; height: number; category?: string };
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { AnyLayer, CAProject, CAAsset, ImageLayer } from "@/lib/ca/types";
type DualCABundle = {
  project: { width: number; height: number; geometryFlipped: 0|1 };
  floating: { root: AnyLayer; assets?: Record<string, CAAsset>; states?: string[]; stateOverrides?: any; stateTransitions?: any };
  background: { root: AnyLayer; assets?: Record<string, CAAsset>; states?: string[]; stateOverrides?: any; stateTransitions?: any };
};
type TendiesBundle = {
  project: { width: number; height: number; geometryFlipped: 0|1 };
  floating?: { root: AnyLayer; assets?: Record<string, CAAsset>; states?: string[]; stateOverrides?: any; stateTransitions?: any };
  background?: { root: AnyLayer; assets?: Record<string, CAAsset>; states?: string[]; stateOverrides?: any; stateTransitions?: any };
  wallpaper?: { root: AnyLayer; assets?: Record<string, CAAsset>; states?: string[]; stateOverrides?: any; stateTransitions?: any };
};
import { ensureUniqueProjectName, createProject, updateProject, deleteProject, getProject, listFiles, listProjects, putBlobFile, putTextFile, isUsingOPFS } from "@/lib/storage";
import { blendModes } from "@/lib/blending";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAnchor } from "@/components/editor/canvas-preview/utils/coordinates";

interface Project { id: string; name: string; createdAt: string; width?: number; height?: number }

const ProjectThumb = React.memo(function ProjectThumb({
  doc,
  width,
  height,
  background,
  freeze = false,
}: {
  doc?: { meta: Pick<CAProject, 'width'|'height'|'background'>; layers: AnyLayer[] },
  width: number,
  height: number,
  background: string,
  freeze?: boolean,
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (freeze) return;
      const r = el.getBoundingClientRect();
      setWrapSize((prev) => {
        const nw = Math.round(r.width);
        const nh = Math.round(r.height);
        if (prev.w === nw && prev.h === nh) return prev;
        return { w: nw, h: nh };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [freeze]);
  const w = (doc?.meta.width ?? width ?? 390);
  const h = (doc?.meta.height ?? height ?? 844);
  const s = wrapSize.w > 0 && wrapSize.h > 0 ? Math.min(wrapSize.w / w, wrapSize.h / h) : 1;
  const ox = (wrapSize.w - w * s) / 2;
  const oy = (wrapSize.h - h * s) / 2;

  const computeCssLT = (l: AnyLayer, containerH: number, useYUp: boolean) => {
    const a = getAnchor(l);
    const left = (l.position.x) - a.x * l.size.w;
    const top = useYUp ? (containerH - (l.position.y + (1 - a.y) * l.size.h)) : (l.position.y - a.y * l.size.h);
    return { left, top, a };
  };
  const renderChildren = (l: AnyLayer, containerH: number = h, useYUp: boolean = true, parentPath: string = ''): React.ReactNode => {
    if (!Array.isArray(l.children)) return null;
    return l.children.map((c: AnyLayer, idx: number) => {
      const childPath = `${parentPath}-child-${idx}`;
      return (
        <React.Fragment key={`${(c as any).id ?? 'child'}-${childPath}`}>
          {renderLayer(c, containerH, useYUp, childPath)}
        </React.Fragment>
      );
    });
  };
  const renderLayer = (l: AnyLayer, containerH: number = h, useYUp: boolean = true, layerPath: string = ''): React.ReactNode => {
    const { left, top, a } = computeCssLT(l, containerH, useYUp);
    const common: React.CSSProperties = {
      position: 'absolute',
      left,
      top,
      width: l.size.w,
      height: l.size.h,
      transform: `rotateX(${-((l as any).rotationX ?? 0)}deg) rotateY(${-((l as any).rotationY ?? 0)}deg) rotate(${-((l as any).rotation ?? 0)}deg)`,
      transformOrigin: `${a.x * 100}% ${a.y * 100}%`,
      opacity: (l as any).opacity ?? 1,
      display: (l as any).visible === false ? 'none' as any : undefined,
      backfaceVisibility: 'hidden',
      transformStyle: 'preserve-3d',
    };
    const blendCss = blendModes[(l as any).blendMode || 'normalBlendMode']?.css;
    if (blendCss) {
      common.mixBlendMode = blendCss;
    }
    if (Array.isArray((l as any).filters)) {
      const filterParts: string[] = [];
      for (const filter of (l as any).filters as Array<{ type: string; value: number; enabled?: boolean }>) {
        if (filter?.enabled === false) continue;
        if (filter.type === 'gaussianBlur') {
          filterParts.push(`blur(${filter.value}px)`);
        } else if (filter.type === 'colorContrast') {
          filterParts.push(`contrast(${filter.value})`);
        } else if (filter.type === 'colorHueRotate') {
          filterParts.push(`hue-rotate(${filter.value}deg)`);
        } else if (filter.type === 'colorInvert') {
          filterParts.push('invert(100%)');
        } else if (filter.type === 'colorSaturate') {
          filterParts.push(`saturate(${filter.value})`);
        } else if (filter.type === 'CISepiaTone') {
          filterParts.push(`sepia(${filter.value})`);
        }
      }
      if (filterParts.length) {
        common.filter = filterParts.join(' ');
      }
    }
    if (l.type === 'text') {
      const t = l as any;
      return <div key={`${l.id}-${layerPath}`} style={{ ...common, color: t.color, fontSize: t.fontSize, textAlign: t.align ?? 'left' }}>
          {t.text}
          {renderChildren(l, l.size.h, useYUp, layerPath)}
        </div>;
    }
    if (l.type === 'image') {
      const im = l as any;
      return <img key={`${l.id}-${layerPath}`} src={im.src} alt={im.name} draggable={false} style={{ ...common, objectFit: 'fill' as const, maxWidth: 'none', maxHeight: 'none' }} />;
    }
    if (l.type === 'gradient') {
      const grad = l as any;
      const gradType = grad.gradientType || 'axial';
      const startX = (grad.startPoint?.x ?? 0) * 100;
      const startY = (grad.startPoint?.y ?? 0) * 100;
      const endX = (grad.endPoint?.x ?? 1) * 100;
      const endY = (grad.endPoint?.y ?? 1) * 100;
      
      const colors = (grad.colors || []).map((c: any) => {
        const opacity = c.opacity ?? 1;
        const hex = c.color || '#000000';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }).join(', ');
      
      let background = '';
      const isSamePoint = Math.abs(startX - endX) < 0.01 && Math.abs(startY - endY) < 0.01;
      
      if (isSamePoint) {
        const firstColor = (grad.colors || [])[0];
        if (firstColor) {
          const opacity = firstColor.opacity ?? 1;
          const hex = firstColor.color || '#000000';
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
      } else if (gradType === 'axial') {
        const dx = endX - startX;
        const dy = -(endY - startY);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        background = `linear-gradient(${angle}deg, ${colors})`;
      } else if (gradType === 'radial') {
        background = `radial-gradient(circle at ${startX}% ${100 - startY}%, ${colors})`;
      } else if (gradType === 'conic') {
        const dx = endX - startX;
        const dy = -(endY - startY);
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        background = `conic-gradient(from ${angle}rad at ${startX}% ${100 - startY}%, ${colors})`;
      }
      
      return <div key={`${l.id}-${layerPath}`} style={{ ...common, background }}>
        {renderChildren(l, l.size.h, useYUp, layerPath)}
      </div>;
    }
    if (l.type === 'shape') {
      const s = l as any;
      const corner = (s.cornerRadius ?? s.radius) ?? 0;
      const borderRadius = s.shape === 'circle' ? 9999 : corner;
      const style: React.CSSProperties = { ...common, background: s.fill, borderRadius };
      if (s.borderColor && s.borderWidth) {
        style.border = `${Math.max(0, Math.round(s.borderWidth))}px solid ${s.borderColor}`;
      }
      if (s.backgroundColor) {
        style.backgroundColor = s.backgroundColor;
      }
      return <div key={`${l.id}-${layerPath}`} style={style}>
        {renderChildren(l, l.size.h, useYUp, layerPath)}
      </div>;
    }
    if (l.type === 'basic' || l.type === 'emitter' || l.type === 'transform') {
      const g = l as any;
      return (
        <div key={`${g.id}-${layerPath}`} style={{ ...common, background: g.backgroundColor }}>
          {renderChildren(l, l.size.h, useYUp, layerPath)}
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={wrapRef} className="w-full h-full relative bg-background">
      <div
        className="absolute"
        style={{
          width: w,
          height: h,
          background: (doc?.meta.background ?? background ?? '#e5e7eb'),
          transform: `translate(${ox}px, ${oy}px) scale(${s})`,
          transformOrigin: 'top left',
          borderRadius: 4,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {((doc?.layers) || []).map((l, i) => {
          const rootPath = `root-${i}`;
          return (
            <React.Fragment key={`${(l as any).id ?? 'layer'}-${rootPath}`}>
              {renderLayer(l, h, true, rootPath)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

function ProjectsContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageFallback, setStorageFallback] = useState<boolean>(false);

  useEffect(() => {
    document.title = "CAPlayground - Projects";
  }, []);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rootWidth, setRootWidth] = useState<number>(390);
  const [rootHeight, setRootHeight] = useState<number>(844);
  const [useDeviceSelector, setUseDeviceSelector] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('iPhone 14');
  const devicesRef = useRef<DeviceSpec[] | null>(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importTendiesInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTosOpen, setIsTosOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [previews, setPreviews] = useState<Record<string, { bg: string; width?: number; height?: number }>>({});
  const [thumbDocs, setThumbDocs] = useState<Record<string, { meta: Pick<CAProject, 'id'|'name'|'width'|'height'|'background'>; layers: AnyLayer[] }>>({});

  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "7" | "30" | "year">("all");
  const [locationFilter, setLocationFilter] = useState<"all" | "device" | "cloud" | "both">("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "name-asc" | "name-desc">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const projectsArray = Array.isArray(projects) ? projects : [];
  const [cloudProjects, setCloudProjects] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudFetched, setCloudFetched] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, any>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, projectName: '' });
  const [syncResultOpen, setSyncResultOpen] = useState(false);
  const [syncResultMessage, setSyncResultMessage] = useState('');
  const [deleteOptionsOpen, setDeleteOptionsOpen] = useState(false);
  const [deleteFromDevice, setDeleteFromDevice] = useState(true);
  const [deleteFromCloud, setDeleteFromCloud] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogContent, setMessageDialogContent] = useState('');

  useEffect(() => {
    const mode = searchParams?.get('mode');
    if (mode === 'upload') {
      setUploadMode(true);
      setIsSelectMode(true);
    }
  }, [searchParams]);

  const fetchCloudProjects = async () => {
    try {
      setLoadingCloud(true);
      const { getSupabaseBrowserClient } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCloudProjects([]);
        return;
      }

      const response = await fetch('/api/drive/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();

        const syncData = JSON.parse(localStorage.getItem('caplayground-sync') || '{}');
        
        const cloudProjs = (data.files || []).map((file: any) => {
          const projectEntry = Object.entries(syncData).find(
            ([_, meta]: [string, any]) => meta.driveFileId === file.id
          );
          
          const projectId = projectEntry ? projectEntry[0] : null;
          const projectName = file.name.replace('.ca.zip', '');
          
          return {
            id: projectId || file.id,
            name: projectName,
            driveFileId: file.id,
            driveFileName: file.name,
            createdAt: file.createdTime,
            isCloudOnly: !projectId
          };
        });
        
        setCloudProjects(cloudProjs);
        setCloudFetched(true);
      }
    } catch (error) {
      console.error('Failed to fetch cloud projects:', error);
    } finally {
      setLoadingCloud(false);
    }
  };

  const getMergedProjects = () => {
    const merged: any[] = [];
    const processedIds = new Set<string>();

    projectsArray.forEach(localProj => {
      const cloudProj = cloudProjects.find(cp => cp.id === localProj.id);
      const sync = syncStatus[localProj.id];
      
      let storageLocation = 'Device';
      let needsSync = false;
      
      if (cloudProj) {
        storageLocation = 'Device and Cloud';
        if (sync && sync.lastModifiedAt && sync.lastSyncedAt) {
          needsSync = new Date(sync.lastModifiedAt) > new Date(sync.lastSyncedAt);
        }
      }
      
      merged.push({
        ...localProj,
        storageLocation,
        needsSync,
        driveFileId: sync?.driveFileId || cloudProj?.driveFileId,
        isLocal: true
      });
      processedIds.add(localProj.id);
    });

    cloudProjects.forEach(cloudProj => {
      if (!processedIds.has(cloudProj.id)) {
        merged.push({
          ...cloudProj,
          storageLocation: 'Cloud',
          needsSync: false,
          isLocal: false,
          isCloudOnly: true
        });
      }
    });

    return merged;
  };

  const [mergedProjects, setMergedProjects] = useState<any[]>([]);

  useEffect(() => {
    const merged = getMergedProjects();
    setMergedProjects(merged);
  }, [projectsArray.length, cloudProjects.length, Object.keys(syncStatus).length]);

  useEffect(() => {
    const syncData = JSON.parse(localStorage.getItem('caplayground-sync') || '{}');
    setSyncStatus(syncData);
  }, [projects]);

  useEffect(() => {
    if (projects && projects.length > 0 && !loadingCloud && !cloudFetched) {
      fetchCloudProjects();
    }
  }, [projects, cloudFetched]);

  useEffect(() => {
    (async () => {
      try {
        try {
          const using = await isUsingOPFS();
          setStorageFallback(!using);
        } catch {}

        const ls = typeof window !== 'undefined' ? localStorage.getItem('caplayground-projects') : null;
        const list: Project[] = ls ? JSON.parse(ls) : [];
        if (!list || list.length === 0) {
          const idbList = await listProjects();
          setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
          return;
        }

        const existing = await listProjects();
        const existingIds = new Set(existing.map(e => e.id));
        for (const p of list) {
          if (existingIds.has(p.id)) continue;
          const key = `caplayground-project:${p.id}`;
          const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          const nameBase = p.name?.trim() || 'Project';
          const uniqueName = await ensureUniqueProjectName(nameBase);
          const meta = { id: p.id, name: uniqueName, createdAt: p.createdAt || new Date().toISOString(), width: Math.round(p.width || 390), height: Math.round(p.height || 844) };
          await createProject({ id: meta.id, name: meta.name, createdAt: meta.createdAt, width: meta.width!, height: meta.height! });
          const folder = `${meta.name}.ca`;
          let parsed: any = null;
          try { parsed = raw ? JSON.parse(raw) : null; } catch {}
          const fixedStates = ["Locked","Unlock","Sleep"] as const;
          const prepare = (layers: any[] | undefined, states?: string[], stateOverrides?: any, stateTransitions?: any) => ({
            layers: Array.isArray(layers) ? layers : [],
            states: (states && states.length ? states : [...fixedStates]) as any,
            stateOverrides: stateOverrides || {},
            stateTransitions: stateTransitions || [],
          });
          let backgroundDoc = prepare([]);
          let floatingDoc = prepare([]);
          if (parsed) {
            if (Array.isArray(parsed.layers)) {
              floatingDoc = prepare(parsed.layers, parsed.states, parsed.stateOverrides, parsed.stateTransitions);
            } else if (parsed.docs) {
              backgroundDoc = prepare(parsed.docs.background?.layers, parsed.docs.background?.states, parsed.docs.background?.stateOverrides, parsed.docs.background?.stateTransitions);
              floatingDoc = prepare(parsed.docs.floating?.layers, parsed.docs.floating?.states, parsed.docs.floating?.stateOverrides, parsed.docs.floating?.stateTransitions);
            }
          }
          const writeCA = async (caKey: 'Background.ca'|'Floating.ca', doc: ReturnType<typeof prepare>) => {
            if (caKey === 'Background.ca') {
              const emptyCaml = `<?xml version="1.0" encoding="UTF-8"?><caml xmlns="http://www.apple.com/CoreAnimation/1.0"/>`;
              await putTextFile(meta.id, `${folder}/${caKey}/main.caml`, emptyCaml);
            } else {
              const root = {
                id: meta.id,
                name: meta.name,
                type: 'basic',
                position: { x: Math.round((meta.width || 0)/2), y: Math.round((meta.height || 0)/2) },
                size: { w: meta.width || 0, h: meta.height || 0 },
                backgroundColor: '#e5e7eb',
                geometryFlipped: 0,
                children: (doc.layers || []) as any[],
              } as any;
              const { serializeCAML } = await import('@/lib/ca/serialize/serializeCAML');
              const caml = serializeCAML(root, { id: meta.id, name: meta.name, width: meta.width, height: meta.height, background: '#e5e7eb', geometryFlipped: 0 } as any, doc.states as any, doc.stateOverrides as any, doc.stateTransitions as any);
              await putTextFile(meta.id, `${folder}/${caKey}/main.caml`, caml);
            }
            const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>rootDocument</key>\n  <string>main.caml</string>\n</dict>\n</plist>`;
            await putTextFile(meta.id, `${folder}/${caKey}/index.xml`, indexXml);
            const assetManifest = `<?xml version="1.0" encoding="UTF-8"?>\n\n<caml xmlns="http://www.apple.com/CoreAnimation/1.0">\n  <MicaAssetManifest>\n    <modules type="NSArray"/>\n  </MicaAssetManifest>\n</caml>`;
            await putTextFile(meta.id, `${folder}/${caKey}/assetManifest.caml`, assetManifest);
            const assets = (parsed?.docs?.[caKey === 'Floating.ca' ? 'floating' : 'background']?.assets) || parsed?.assets || {};
            for (const [_, info] of Object.entries(assets as Record<string, { filename: string; dataURL: string }>)) {
              try {
                const blob = await dataURLToBlob((info as any).dataURL);
                await putBlobFile(meta.id, `${folder}/${caKey}/assets/${(info as any).filename}`, blob);
              } catch {}
            }
          };
          await writeCA('Background.ca', backgroundDoc);
          await writeCA('Floating.ca', floatingDoc);
        }
        try {
          for (const p of list) localStorage.removeItem(`caplayground-project:${p.id}`);
          localStorage.removeItem('caplayground-projects');
        } catch {}
        const idbList = await listProjects();
        setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
      } catch {
        const idbList = await listProjects();
        setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
      }
    })();
  }, []);

  const renderHighlighted = (text: string, q: string) => {
    const query = (q || "").trim();
    if (!query) return text;
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      const re = new RegExp(esc, "ig");
      const parts: Array<{ str: string; match: boolean }> = [];
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m.index > lastIndex) parts.push({ str: text.slice(lastIndex, m.index), match: false });
        parts.push({ str: m[0], match: true });
        lastIndex = re.lastIndex;
      }
      if (lastIndex < text.length) parts.push({ str: text.slice(lastIndex), match: false });
      return (
        <>
          {parts.map((p, i) => p.match
            ? <span key={i} className="bg-yellow-200/60 dark:bg-yellow-300/20 rounded px-0.5">
                {p.str}
              </span>
            : <span key={i}>{p.str}</span>
          )}
        </>
      );
    } catch {
      return text;
    }
  };

  const recordProjectCreated = () => {
    try {
      fetch("/api/analytics/project-created", { method: "POST", keepalive: true }).catch(() => {})
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase");
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;
        setIsSignedIn(hasSession);
        try {
          const accepted = localStorage.getItem("caplayground-tos-accepted") === "true";
          if (!hasSession && !accepted) setIsTosOpen(true);
        } catch {
          if (!hasSession) setIsTosOpen(true);
        }
      } catch {
        try {
          const accepted = localStorage.getItem("caplayground-tos-accepted") === "true";
          if (!accepted) setIsTosOpen(true);
        } catch {}
      }
    })();
  }, []);

  

  

  const filteredProjects = useMemo(() => {
    const now = new Date();
    const matchesQuery = (name: string) =>
      query.trim() === "" || name.toLowerCase().includes(query.trim().toLowerCase());
    const inDateRange = (createdAt: string) => {
      if (dateFilter === "all") return true;
      const created = new Date(createdAt);
      if (Number.isNaN(created.getTime())) return true;
      switch (dateFilter) {
        case "7": {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          return created >= d;
        }
        case "30": {
          const d = new Date(now);
          d.setDate(d.getDate() - 30);
          return created >= d;
        }
        case "year": {
          return created.getFullYear() === now.getFullYear();
        }
        default:
          return true;
      }
    };

    const matchesLocation = (location: string) => {
      if (locationFilter === "all") return true;
      if (locationFilter === "device") return location === "Device";
      if (locationFilter === "cloud") return location === "Cloud";
      if (locationFilter === "both") return location === "Device and Cloud";
      return true;
    };

    const arr = mergedProjects.filter((p) => matchesQuery(p.name) && inDateRange(p.createdAt) && matchesLocation(p.storageLocation));

    const sorted = [...arr].sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });
    return sorted;
  }, [mergedProjects, query, dateFilter, locationFilter, sortBy]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, dateFilter, locationFilter, sortBy, mergedProjects.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting) {
        setVisibleCount((prev) => {
          const next = Math.min(prev + PAGE_SIZE, filteredProjects.length);
          return next;
        });
      }
    }, { root: null, rootMargin: "200px", threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredProjects.length]);

  useEffect(() => {
    (async () => {
      try {
        const visibleList = filteredProjects.slice(0, visibleCount);
        const need = visibleList.filter((p) => !(previews[p.id] && thumbDocs[p.id]));
        if (need.length === 0) return;

        const nextPreviews = { ...previews } as Record<string, { bg: string; width?: number; height?: number }>;
        const nextDocs = { ...thumbDocs } as Record<string, { meta: Pick<CAProject,'id'|'name'|'width'|'height'|'background'>; layers: AnyLayer[] }>;

        for (const p of need) {
          const folder = `${p.name}.ca`;
          const [floating, background, wallpaper] = await Promise.all([
            listFiles(p.id, `${folder}/Floating.ca/`),
            listFiles(p.id, `${folder}/Background.ca/`),
            listFiles(p.id, `${folder}/Wallpaper.ca/`),
          ]);
          const byPath = new Map([...floating, ...background, ...wallpaper].map(f => [f.path, f] as const));
          const floatingMain = byPath.get(`${folder}/Floating.ca/main.caml`);
          const backgroundMain = byPath.get(`${folder}/Background.ca/main.caml`);
          const wallpaperMain = byPath.get(`${folder}/Wallpaper.ca/main.caml`);
          const main = floatingMain || backgroundMain || wallpaperMain;
          let bg = '#e5e7eb';
          let width = p.width;
          let height = p.height;
          let layers: AnyLayer[] = [];
          if (main && main.type === 'text' && typeof main.data === 'string') {
            try {
              const { parseCAML } = await import('@/lib/ca/caml');
              const root = parseCAML(main.data) as any;
              if (root) {
                width = Math.round(root.size?.w || width || 390);
                height = Math.round(root.size?.h || height || 844);
                if (typeof root.backgroundColor === 'string') bg = root.backgroundColor;
                layers = root.children?.length ? root.children : [root];
              }
            } catch {}
          }
          const toDataURL = async (buf: ArrayBuffer): Promise<string> => {
            return await new Promise((resolve) => {
              const blob = new Blob([buf]);
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.readAsDataURL(blob);
            });
          };
          if (backgroundMain && backgroundMain.type === 'text' && typeof backgroundMain.data === 'string' && main !== backgroundMain) {
            try {
              const { parseCAML } = await import('@/lib/ca/caml');
              const root = parseCAML(backgroundMain.data) as any;
              if (root) {
                if (typeof root.backgroundColor === 'string') bg = root.backgroundColor;
                const backgroundLayers = root.children?.length ? root.children : [root];
                layers = [...backgroundLayers, ...layers];
              }
            } catch {}
          }
          const filenameToDataURL: Record<string, string> = {};
          const assetFiles = [...floating, ...background, ...wallpaper].filter(f => /\/assets\//.test(f.path) && f.type === 'blob');
          for (const f of assetFiles) {
            const filename = f.path.split('/assets/')[1];
            try {
              filenameToDataURL[filename] = await toDataURL(f.data as ArrayBuffer);
            } catch {}
          }
          const applyAssetSrc = (arr: AnyLayer[]): AnyLayer[] => arr.map((l) => {
            let newL: AnyLayer | undefined = { ...l };
            if (l.children?.length) {
              newL.children = applyAssetSrc(l.children || []);
            }
            if (l.type === 'image') {
              const name = (l.src || '').split('/').pop() || '';
              const dataURL = filenameToDataURL[name];
              if (dataURL) {
                (newL as ImageLayer).src = dataURL;
              }
            }
            return newL;
          });
          if (layers && layers.length) layers = applyAssetSrc(layers);

          nextPreviews[p.id] = { bg, width, height };
          nextDocs[p.id] = { meta: { id: p.id, name: p.name, width: width || 390, height: height || 844, background: bg }, layers };
        }

        setPreviews(nextPreviews);
        setThumbDocs(nextDocs);
      } catch {}
    })();
  }, [filteredProjects, visibleCount, previews, thumbDocs]);

  // helper to convert dataURL -> Blob
  const dataURLToBlob = async (dataURL: string): Promise<Blob> => {
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

  const createProjectFromDialog = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    
    let w: number, h: number;
    if (useDeviceSelector) {
      if (!devicesRef.current) {
        try {
          const mod = await import("@/lib/devices");
          devicesRef.current = mod.devices as DeviceSpec[];
        } catch { devicesRef.current = []; }
      }
      const device = (devicesRef.current || []).find(d => d.name === selectedDevice);
      if (!device) return;
      w = device.width;
      h = device.height;
    } else {
      w = Number(rootWidth);
      h = Number(rootHeight);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    }

    const id = Date.now().toString();
    const uniqueName = await ensureUniqueProjectName(name);
    const createdAt = new Date().toISOString();
    await createProject({ id, name: uniqueName, createdAt, width: Math.round(w), height: Math.round(h), gyroEnabled });
    const idbList = await listProjects();
    setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
    recordProjectCreated();
    setNewProjectName("");
    setRootWidth(390);
    setRootHeight(844);
    setUseDeviceSelector(false);
    setSelectedDevice('iPhone 14');
    setGyroEnabled(false);
    setIsCreateOpen(false);
  };

  const startEditing = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setIsRenameOpen(true);
  };

  const saveEdit = async () => {
    if (editingProjectId === null || editingName.trim() === "") return;
    const unique = await ensureUniqueProjectName(editingName.trim());
    const current = await getProject(editingProjectId);
    if (current) {
      await updateProject({ ...current, name: unique });
      const idbList = await listProjects();
      setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
    }
    
    setEditingProjectId(null);
    setEditingName("");
    setIsRenameOpen(false);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    const idbList = await listProjects();
    setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
    
    setPreviews(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setThumbDocs(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  };

  const confirmDelete = (projectOrId: any) => {
    const project = typeof projectOrId === 'string' 
      ? mergedProjects.find(p => p.id === projectOrId)
      : projectOrId;
    
    if (!project) return;

    if (project.storageLocation === 'Device and Cloud') {
      setProjectToDelete(project);
      setDeleteFromDevice(true);
      setDeleteFromCloud(false);
      setDeleteOptionsOpen(true);
    } else {
      setPendingDeleteId(project.id);
      setIsDeleteOpen(true);
    }
  };

  const performDeleteWithOptions = async () => {
    if (!projectToDelete) return;
    
    try {
      if (deleteFromDevice) {
        await deleteProject(projectToDelete.id);
        const idbList = await listProjects();
        setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
      }
      
      if (deleteFromCloud && projectToDelete.driveFileId) {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase");
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          try {
            const response = await fetch('/api/drive/delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ fileId: projectToDelete.driveFileId })
            });
            
            if (response.ok) {
              const syncData = JSON.parse(localStorage.getItem('caplayground-sync') || '{}');
              delete syncData[projectToDelete.id];
              localStorage.setItem('caplayground-sync', JSON.stringify(syncData));
              
              setCloudFetched(false);
              fetchCloudProjects();
            }
          } catch (error) {
            console.error('Failed to delete from cloud:', error);
          }
        }
      }
      
      setDeleteOptionsOpen(false);
      setProjectToDelete(null);
      setDeleteFromDevice(true);
      setDeleteFromCloud(false);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode((v) => {
      const next = !v;
      if (!next) setSelectedIds([]);
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const syncProjects = async (projectIds: string[]) => {
    if (projectIds.length === 0) return;
    
    try {
      setIsSyncing(true);
      setSyncProgress({ current: 0, total: projectIds.length, projectName: '' });

      const { getSupabaseBrowserClient } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setSyncResultMessage('Please sign in to sync to Google Drive');
        setSyncResultOpen(true);
        return;
      }

      const JSZip = (await import('jszip')).default;
      const { getProject, listFiles } = await import('@/lib/storage');

      const projectsData = [];
      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        try {
          const project = await getProject(projectId);
          if (!project) continue;

          setSyncProgress({ current: i, total: projectIds.length, projectName: project.name });

          const folderName = `${project.name}.ca`;
          const files = await listFiles(projectId, folderName);
          
          const zip = new JSZip();
          
          zip.file('metadata.json', JSON.stringify({
            id: project.id,
            name: project.name,
            width: project.width,
            height: project.height,
            createdAt: project.createdAt,
            uploadedAt: new Date().toISOString()
          }));

          for (const file of files) {
            const relativePath = file.path.replace(`${folderName}/`, '');
            if (file.type === 'text' && typeof file.data === 'string') {
              zip.file(relativePath, file.data);
            } else if (file.type === 'blob' && file.data instanceof ArrayBuffer) {
              zip.file(relativePath, file.data);
            }
          }

          const zipBase64 = await zip.generateAsync({ type: 'base64' });
          
          projectsData.push({
            id: projectId,
            name: project.name,
            zipData: zipBase64
          });
        } catch (error: any) {
          console.error(`Failed to prepare project ${projectId}:`, error);
        }
      }

      if (projectsData.length === 0) {
        setSyncResultMessage('No projects could be prepared for sync');
        setSyncResultOpen(true);
        return;
      }

      setSyncProgress({ current: projectIds.length, total: projectIds.length, projectName: 'Uploading...' });

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ projects: projectsData })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Upload failed';
        throw new Error(errorMsg);
      }

      if (data.results && Array.isArray(data.results)) {
        const syncData = JSON.parse(localStorage.getItem('caplayground-sync') || '{}');
        const now = new Date().toISOString();
        
        let updatedCount = 0;
        let createdCount = 0;
        
        for (const result of data.results) {
          if (result.success && result.projectId && result.fileId) {
            syncData[result.projectId] = {
              driveFileId: result.fileId,
              lastSyncedAt: now,
              lastModifiedAt: now,
              fileName: result.fileName
            };
            
            if (result.updated) {
              updatedCount++;
            } else {
              createdCount++;
            }
          }
        }
        localStorage.setItem('caplayground-sync', JSON.stringify(syncData));
        
        let message = '';
        if (updatedCount > 0 && createdCount > 0) {
          message = `Updated ${updatedCount} and uploaded ${createdCount} new project${createdCount > 1 ? 's' : ''} to Google Drive!`;
        } else if (updatedCount > 0) {
          message = `Updated ${updatedCount} project${updatedCount > 1 ? 's' : ''} in Google Drive!`;
        } else if (createdCount > 0) {
          message = `Uploaded ${createdCount} new project${createdCount > 1 ? 's' : ''} to Google Drive!`;
        } else {
          message = `Successfully synced ${data.uploaded} of ${data.total} project${data.total > 1 ? 's' : ''} to Google Drive!`;
        }
        
        setSyncResultMessage(message);
      } else {
        setSyncResultMessage(`Successfully synced ${data.uploaded} of ${data.total} project${data.total > 1 ? 's' : ''} to Google Drive!`);
      }
      
      setSyncResultOpen(true);
      
      setCloudFetched(false);
      fetchCloudProjects();

    } catch (error: any) {
      console.error('Upload error:', error);
      setSyncResultMessage(`Failed to sync: ${error.message}`);
      setSyncResultOpen(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUploadToDrive = async () => {
    await syncProjects(selectedIds);
    setSelectedIds([]);
    setIsSelectMode(false);
    setUploadMode(false);
  };

  const syncSingleProject = async (projectId: string) => {
    await syncProjects([projectId]);
  };

  const openProject = async (project: any) => {
    if (project.isCloudOnly) {
      try {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase");
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setSyncResultMessage('Please sign in to access cloud projects');
          setSyncResultOpen(true);
          return;
        }
        
        setIsSyncing(true);
        setSyncProgress({ current: 0, total: 1, projectName: 'Downloading...' });
        
        const response = await fetch('/api/drive/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ fileId: project.driveFileId })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        const JSZip = (await import('jszip')).default;
        const { createProject, putTextFile, putBlobFile } = await import('@/lib/storage');
        
        const zipBuffer = Uint8Array.from(atob(data.zipData), c => c.charCodeAt(0));
        const zip = await JSZip.loadAsync(zipBuffer);
        const metadataFile = zip.file('metadata.json');
        if (!metadataFile) throw new Error('Invalid project file');
        
        const metadataText = await metadataFile.async('text');
        const metadata = JSON.parse(metadataText);
        
        await createProject({
          id: metadata.id,
          name: metadata.name,
          width: metadata.width,
          height: metadata.height,
          createdAt: metadata.createdAt
        });
        
        const folderName = `${metadata.name}.ca`;
        await Promise.all(
          Object.keys(zip.files).map(async (relativePath) => {
            if (relativePath === 'metadata.json') return;
            const file = zip.files[relativePath];
            if (file.dir) return;
            const fullPath = `${folderName}/${relativePath}`;
            if (relativePath.endsWith('.caml') || relativePath.endsWith('.json')) {
              const text = await file.async('text');
              await putTextFile(metadata.id, fullPath, text);
            } else {
              const buffer = await file.async('arraybuffer');
              await putBlobFile(metadata.id, fullPath, buffer);
            }
          })
        );
        
        const syncData = JSON.parse(localStorage.getItem('caplayground-sync') || '{}');
        syncData[metadata.id] = {
          driveFileId: project.driveFileId,
          lastSyncedAt: new Date().toISOString(),
          lastModifiedAt: new Date().toISOString()
        };
        localStorage.setItem('caplayground-sync', JSON.stringify(syncData));
        
        setIsSyncing(false);
        router.push(`/editor/${metadata.id}`);
      } catch (error: any) {
        setIsSyncing(false);
        setSyncResultMessage(`Failed to download: ${error.message}`);
        setSyncResultOpen(true);
      }
    } else {
      router.push(`/editor/${project.id}`);
    }
  };

  const handleImportClick = () => setIsImportDialogOpen(true);
  const handleImportCAClick = () => {
    setIsImportDialogOpen(false);
    importInputRef.current?.click();
  };
  const handleImportTendiesClick = () => {
    setIsImportDialogOpen(false);
    importTendiesInputRef.current?.click();
  };

  const handleImportChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const isZip = /zip$/i.test(file.type) || /\.zip$/i.test(file.name);
      let dual: DualCABundle | null = null;
      let bundle: any = null;
      if (isZip) {
        try {
          const { unpackDualCAZip } = await import('@/lib/ca/ca-file');
          dual = await unpackDualCAZip(file);
        } catch (err: any) {
          const msg = String(err?.message || '');
          // Fallback: treat as a single .ca package (a zip with main.caml)
          try {
            const { unpackCA } = await import('@/lib/ca/ca-file');
            bundle = await unpackCA(file);
          } catch (fallbackErr) {
            if (msg.startsWith('UNSUPPORTED_ZIP_STRUCTURE')) {
              setMessageDialogTitle('Import Error');
              setMessageDialogContent('Zip not supported: expected both Background.ca and Floating.ca, and failed to read as a single .ca package.');
              setMessageDialogOpen(true);
              return;
            }
            throw err;
          }
        }
      } else {
        const { unpackCA } = await import('@/lib/ca/ca-file');
        bundle = await unpackCA(file);
      }
      const id = Date.now().toString();
      const base = (bundle?.project?.name) || "Imported Project";
      const name = await ensureUniqueProjectName(base);
      const width = Math.round((dual?.project.width) ?? (bundle?.project.width || (bundle?.root?.size?.w ?? 0)));
      const height = Math.round((dual?.project.height) ?? (bundle?.project.height || (bundle?.root?.size?.h ?? 0)));
      const folder = `${name}.ca`;
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>rootDocument</key>\n  <string>main.caml</string>\n</dict>\n</plist>`;
      const assetManifest = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<caml xmlns=\"http://www.apple.com/CoreAnimation/1.0\">\n  <MicaAssetManifest>\n    <modules type=\"NSArray\"/>\n  </MicaAssetManifest>\n</caml>`;
      const root = dual ? dual.floating.root : bundle.root;
      const gyroEnabled = root?.children?.some((child: AnyLayer) => ['BACKGROUND', 'FLOATING'].includes(child.name)) ?? false;
      await createProject({ id,name, createdAt: new Date().toISOString(), width, height, gyroEnabled });
       
      const mkCaml = async (layers: AnyLayer[]) => {
        const { serializeCAML } = await import('@/lib/ca/serialize/serializeCAML');
        const group = {
          id,
          name: 'Root Layer',
          type: 'basic',
          position: { x: Math.round((width||0)/2), y: Math.round((height||0)/2) },
          size: { w: width||0, h: height||0 },
          backgroundColor: root?.backgroundColor ?? '#e5e7eb',
          geometryFlipped: ((dual?.project.geometryFlipped) ?? (bundle?.project.geometryFlipped ?? 0)) as 0|1,
          children: layers,
        } as any;
        const states = (dual ? dual.floating.states : bundle.states) as any;
        const stateOverrides = (dual ? dual.floating.stateOverrides : bundle.stateOverrides) as any;
        const stateTransitions = (dual ? dual.floating.stateTransitions : bundle.stateTransitions) as any;
        const wallpaperParallaxGroups = bundle?.wallpaperParallaxGroups;
        return serializeCAML(
          group,
          { id, name, width, height, background: root?.backgroundColor ?? '#e5e7eb', geometryFlipped: ((dual?.project.geometryFlipped) ?? (bundle?.project.geometryFlipped ?? 0)) as 0|1 } as any,
          states,
          stateOverrides,
          stateTransitions,
          wallpaperParallaxGroups
        );
      };
      if (dual) {
        // Floating from dual
        const flRoot = dual.floating.root as any;
        const flLayers = Array.isArray(flRoot.children) ? flRoot.children : (flRoot ? [flRoot] : []);
        const camlFloating = await mkCaml(flLayers);
        await putTextFile(id, `${folder}/Floating.ca/main.caml`, camlFloating);
        await putTextFile(id, `${folder}/Floating.ca/index.xml`, indexXml);
        await putTextFile(id, `${folder}/Floating.ca/assetManifest.caml`, assetManifest);
        // Background from dual
        const bgRoot = dual.background.root as any;
        const bgLayers = Array.isArray(bgRoot.children) ? bgRoot.children : (bgRoot ? [bgRoot] : []);
        const { serializeCAML } = await import('@/lib/ca/serialize/serializeCAML');
        const bgGroup = {
          id: `${id}-bg`,
          name: 'Root Layer',
          type: 'basic',
          position: { x: Math.round((width||0)/2), y: Math.round((height||0)/2) },
          size: { w: width||0, h: height||0 },
          backgroundColor: (bgRoot?.backgroundColor ?? '#e5e7eb'),
          geometryFlipped: ((dual.project.geometryFlipped) as 0|1),
          children: bgLayers,
        } as any;
        const camlBackground = serializeCAML(bgGroup, { id, name, width, height, background: (bgRoot?.backgroundColor ?? '#e5e7eb'), geometryFlipped: dual.project.geometryFlipped } as any, dual.background.states as any, dual.background.stateOverrides as any, dual.background.stateTransitions as any);
        await putTextFile(id, `${folder}/Background.ca/main.caml`, camlBackground);
        await putTextFile(id, `${folder}/Background.ca/index.xml`, indexXml);
        await putTextFile(id, `${folder}/Background.ca/assetManifest.caml`, assetManifest);
      } else {
        const layers = Array.isArray(root.children) ? root.children : (root ? [root] : []);
        const camlFloating = await mkCaml(layers);
        const emptyBackgroundCaml = `<?xml version="1.0" encoding="UTF-8"?><caml xmlns="http://www.apple.com/CoreAnimation/1.0"/>`;
        if (gyroEnabled) {
          await putTextFile(id, `${folder}/Wallpaper.ca/main.caml`, camlFloating);
          await putTextFile(id, `${folder}/Wallpaper.ca/index.xml`, indexXml);
          await putTextFile(id, `${folder}/Wallpaper.ca/assetManifest.caml`, assetManifest);
        } else {
          await putTextFile(id, `${folder}/Floating.ca/main.caml`, camlFloating);
          await putTextFile(id, `${folder}/Floating.ca/index.xml`, indexXml);
          await putTextFile(id, `${folder}/Floating.ca/assetManifest.caml`, assetManifest);
          await putTextFile(id, `${folder}/Background.ca/main.caml`, emptyBackgroundCaml);
          await putTextFile(id, `${folder}/Background.ca/index.xml`, indexXml);
          await putTextFile(id, `${folder}/Background.ca/assetManifest.caml`, assetManifest);
        }
      }
      // assets
      if (dual) {
        const flAssets = (dual.floating.assets || {}) as Record<string, CAAsset>;
        for (const [filename, asset] of Object.entries(flAssets)) {
          try {
            const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer]);
            await putBlobFile(id, `${folder}/Floating.ca/assets/${filename}`, data);
          } catch {}
        }
        const bgAssets = (dual.background.assets || {}) as Record<string, CAAsset>;
        for (const [filename, asset] of Object.entries(bgAssets)) {
          try {
            const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer]);
            await putBlobFile(id, `${folder}/Background.ca/assets/${filename}`, data);
          } catch {}
        }
      } else if (bundle?.assets) {
        const assets = bundle.assets as Record<string, CAAsset>;
        for (const [filename, asset] of Object.entries(assets)) {
          try {
            const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer]);
            await putBlobFile(id, `${folder}/${gyroEnabled ? 'Wallpaper' : 'Floating'}.ca/assets/${filename}`, data);
          } catch {}
        }
      }
      const idbList = await listProjects();
      setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
      recordProjectCreated();

      router.push(`/editor/${id}`);
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleImportTendiesChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const { unpackTendies } = await import('@/lib/ca/ca-file');
      const tendies = await unpackTendies(file);
      
      const id = Date.now().toString();
      const fileName = file.name.replace(/\.(ca|tendies)$/i, '');
      const name = await ensureUniqueProjectName(fileName);
      const width = Math.round(tendies.project.width);
      const height = Math.round(tendies.project.height);
      await createProject({ id, name, createdAt: new Date().toISOString(), width, height, gyroEnabled: !!tendies.wallpaper });
      const folder = `${name}.ca`;
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>rootDocument</key>\n  <string>main.caml</string>\n</dict>\n</plist>`;
      const assetManifest = `<?xml version="1.0" encoding="UTF-8"?>\n\n<caml xmlns="http://www.apple.com/CoreAnimation/1.0">\n  <MicaAssetManifest>\n    <modules type="NSArray"/>\n  </MicaAssetManifest>\n</caml>`;
      
      const { serializeCAML } = await import('@/lib/ca/serialize/serializeCAML');
      
      const mkCaml = async (doc: { root: AnyLayer; assets?: Record<string, CAAsset>; states?: string[]; stateOverrides?: any; stateTransitions?: any; wallpaperParallaxGroups?: any }, docName: string) => {
        const root = doc.root as any;
        const layers = Array.isArray(root.children) ? root.children : (root ? [root] : []);
        const group = {
          id: `${id}-${docName}`,
          name: `Root Layer`,
          type: 'basic',
          position: { x: Math.round(width/2), y: Math.round(height/2) },
          size: { w: width, h: height },
          backgroundColor: root?.backgroundColor ?? '#e5e7eb',
          geometryFlipped: tendies.project.geometryFlipped,
          children: layers,
        } as any;
        return serializeCAML(
          group,
          { id, name, width, height, background: root?.backgroundColor ?? '#e5e7eb', geometryFlipped: tendies.project.geometryFlipped } as any,
          doc.states as any,
          doc.stateOverrides as any,
          doc.stateTransitions as any,
          doc.wallpaperParallaxGroups as any
        );
      };
      
      if (tendies.wallpaper) {
        const camlWallpaper = await mkCaml(tendies.wallpaper, 'Wallpaper');
        await putTextFile(id, `${folder}/Wallpaper.ca/main.caml`, camlWallpaper);
        await putTextFile(id, `${folder}/Wallpaper.ca/index.xml`, indexXml);
        await putTextFile(id, `${folder}/Wallpaper.ca/assetManifest.caml`, assetManifest);

        const flAssets = (tendies.wallpaper.assets || {}) as Record<string, CAAsset>;
        for (const [filename, asset] of Object.entries(flAssets)) {
          try {
            const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer]);
            await putBlobFile(id, `${folder}/Wallpaper.ca/assets/${filename}`, data);
          } catch {}
        }
      } else {
        const floatingDoc = tendies.floating;
        if (floatingDoc) {
          const camlFloating = await mkCaml(floatingDoc, 'Floating');
          await putTextFile(id, `${folder}/Floating.ca/main.caml`, camlFloating);
          await putTextFile(id, `${folder}/Floating.ca/index.xml`, indexXml);
          await putTextFile(id, `${folder}/Floating.ca/assetManifest.caml`, assetManifest);
  
          const flAssets = (floatingDoc.assets || {}) as Record<string, CAAsset>;
          for (const [filename, asset] of Object.entries(flAssets)) {
            try {
              const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer]);
              await putBlobFile(id, `${folder}/Floating.ca/assets/${filename}`, data);
            } catch {}
          }
        } else {
          const emptyFloatingCaml = `<?xml version="1.0" encoding="UTF-8"?><caml xmlns="http://www.apple.com/CoreAnimation/1.0"/>`;
          await putTextFile(id, `${folder}/Floating.ca/main.caml`, emptyFloatingCaml);
          await putTextFile(id, `${folder}/Floating.ca/index.xml`, indexXml);
          await putTextFile(id, `${folder}/Floating.ca/assetManifest.caml`, assetManifest);
        }
        
        if (tendies.background) {
          const camlBackground = await mkCaml(tendies.background, 'Background');
          await putTextFile(id, `${folder}/Background.ca/main.caml`, camlBackground);
          await putTextFile(id, `${folder}/Background.ca/index.xml`, indexXml);
          await putTextFile(id, `${folder}/Background.ca/assetManifest.caml`, assetManifest);
          
          const bgAssets = (tendies.background.assets || {}) as Record<string, CAAsset>;
          for (const [filename, asset] of Object.entries(bgAssets)) {
            try {
              const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer]);
              await putBlobFile(id, `${folder}/Background.ca/assets/${filename}`, data);
            } catch {}
          }
        } else {
          const emptyBackgroundCaml = `<?xml version="1.0" encoding="UTF-8"?><caml xmlns="http://www.apple.com/CoreAnimation/1.0"/>`;
          await putTextFile(id, `${folder}/Background.ca/main.caml`, emptyBackgroundCaml);
          await putTextFile(id, `${folder}/Background.ca/index.xml`, indexXml);
          await putTextFile(id, `${folder}/Background.ca/assetManifest.caml`, assetManifest);
        }
      }
      
      const idbList = await listProjects();
      setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
      recordProjectCreated();
      
      router.push(`/editor/${id}`);
    } catch (err) {
      console.error('Tendies import failed', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (errorMessage.includes('MERCURY_POSTER_NOT_SUPPORTED')) {
        setMessageDialogTitle('Mercury Poster Not Supported'); // mercury wallpapers are stored in system files, so they can't be imported into CAP
        setMessageDialogContent('Mercury Poster wallpapers cannot be imported into CAPlayground. These wallpapers store their assets in system files that cannot be modified or extracted.');
      } else {
        setMessageDialogTitle('Import Error');
        setMessageDialogContent(`Failed to import tendies file: ${errorMessage}`);
      }
      setMessageDialogOpen(true);
    } finally {
      if (importTendiesInputRef.current) importTendiesInputRef.current.value = '';
    }
  };

  const openBulkDelete = () => {
    setDeleteFromDevice(true);
    setDeleteFromCloud(false);
    setIsBulkDeleteOpen(true);
  };
  
  const performBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!deleteFromDevice && !deleteFromCloud) return;
    
    try {
      const selectedProjects = mergedProjects.filter(p => selectedIds.includes(p.id));
      
      for (const project of selectedProjects) {
        if (deleteFromDevice) {
          await deleteProject(project.id);
        }
        
        if (deleteFromCloud && project.driveFileId) {
          const { getSupabaseBrowserClient } = await import("@/lib/supabase");
          const supabase = getSupabaseBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) continue;
          
          try {
            const response = await fetch('/api/drive/delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ fileId: project.driveFileId })
            });
            
            if (response.ok) {
              const syncData = JSON.parse(localStorage.getItem('caplayground-sync') || '{}');
              delete syncData[project.id];
              localStorage.setItem('caplayground-sync', JSON.stringify(syncData));
            }
          } catch (err) {
            console.error(`Failed to delete ${project.name} from cloud:`, err);
          }
        }
      }
      
      if (deleteFromDevice) {
        const idbList = await listProjects();
        setProjects(idbList.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt, width: p.width, height: p.height })));
      }
      
      if (deleteFromCloud) {
        await fetchCloudProjects();
      }
    } finally {
      setSelectedIds([]);
      setIsSelectMode(false);
      setIsBulkDeleteOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      createProjectFromDialog();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      setEditingProjectId(null);
      setEditingName("");
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between pt-6">
          <div className="flex-1">
            <div className="mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-sfpro text-3xl md:text-4xl font-bold">Your Projects</h1>
              {loadingCloud && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <span className="inline-block h-3 w-3 border-2 border-t-transparent border-blue-800 rounded-full animate-spin" />
                  Loading cloud...
                </span>
              )}
              {storageFallback && (
                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  Storage: IndexedDB fallback
                </span>
              )}
            </div>
            <p className="text-muted-foreground">Create and manage your CoreAnimation projects stored locally on your device.</p>
            {/* Search & filters */}
            <div className="mt-4 flex gap-2 items-center">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects by name..."
                className="max-w-md"
              />
              <div className="border rounded-md p-0.5 flex">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("list")}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Time Period</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setDateFilter("all")}
                    className={dateFilter === "all" ? "bg-accent" : ""}
                  >
                    {dateFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                    {dateFilter !== "all" && <span className="w-4 mr-2" />}
                    All time
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDateFilter("7")}
                    className={dateFilter === "7" ? "bg-accent" : ""}
                  >
                    {dateFilter === "7" && <Check className="h-4 w-4 mr-2" />}
                    {dateFilter !== "7" && <span className="w-4 mr-2" />}
                    Last 7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDateFilter("30")}
                    className={dateFilter === "30" ? "bg-accent" : ""}
                  >
                    {dateFilter === "30" && <Check className="h-4 w-4 mr-2" />}
                    {dateFilter !== "30" && <span className="w-4 mr-2" />}
                    Last 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDateFilter("year")}
                    className={dateFilter === "year" ? "bg-accent" : ""}
                  >
                    {dateFilter === "year" && <Check className="h-4 w-4 mr-2" />}
                    {dateFilter !== "year" && <span className="w-4 mr-2" />}
                    This year
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Storage Location</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setLocationFilter("all")}
                    className={locationFilter === "all" ? "bg-accent" : ""}
                  >
                    {locationFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                    {locationFilter !== "all" && <span className="w-4 mr-2" />}
                    All locations
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocationFilter("device")}
                    className={locationFilter === "device" ? "bg-accent" : ""}
                  >
                    {locationFilter === "device" && <Check className="h-4 w-4 mr-2" />}
                    {locationFilter !== "device" && <span className="w-4 mr-2" />}
                    Device only
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocationFilter("cloud")}
                    className={locationFilter === "cloud" ? "bg-accent" : ""}
                  >
                    {locationFilter === "cloud" && <Check className="h-4 w-4 mr-2" />}
                    {locationFilter !== "cloud" && <span className="w-4 mr-2" />}
                    Cloud only
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocationFilter("both")}
                    className={locationFilter === "both" ? "bg-accent" : ""}
                  >
                    {locationFilter === "both" && <Check className="h-4 w-4 mr-2" />}
                    {locationFilter !== "both" && <span className="w-4 mr-2" />}
                    Device and Cloud
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setSortBy("recent")}
                    className={sortBy === "recent" ? "bg-accent" : ""}
                  >
                    {sortBy === "recent" && <Check className="h-4 w-4 mr-2" />}
                    {sortBy !== "recent" && <span className="w-4 mr-2" />}
                    Newest first
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("oldest")}
                    className={sortBy === "oldest" ? "bg-accent" : ""}
                  >
                    {sortBy === "oldest" && <Check className="h-4 w-4 mr-2" />}
                    {sortBy !== "oldest" && <span className="w-4 mr-2" />}
                    Oldest first
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("name-asc")}
                    className={sortBy === "name-asc" ? "bg-accent" : ""}
                  >
                    {sortBy === "name-asc" && <Check className="h-4 w-4 mr-2" />}
                    {sortBy !== "name-asc" && <span className="w-4 mr-2" />}
                    Name A → Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("name-desc")}
                    className={sortBy === "name-desc" ? "bg-accent" : ""}
                  >
                    {sortBy === "name-desc" && <Check className="h-4 w-4 mr-2" />}
                    {sortBy !== "name-desc" && <span className="w-4 mr-2" />}
                    Name Z → A
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="w-full md:w-auto flex gap-2">
            <Button variant={isSelectMode ? "secondary" : "outline"} onClick={toggleSelectMode}>
              {isSelectMode ? "Done" : "Select"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".ca,application/zip"
              onChange={handleImportChange}
              className="hidden"
            />
            <input
              ref={importTendiesInputRef}
              type="file"
              accept=".tendies"
              onChange={handleImportTendiesChange}
              className="hidden"
            />
            {!isSelectMode && (
              <>
                <Button variant="outline" onClick={handleImportClick}>
                  <Upload className="h-4 w-4 mr-2" /> Import
                </Button>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Project
                </Button>
              </>
            )}
            {isSelectMode && (
              <>
                <Button
                  variant="destructive"
                  onClick={openBulkDelete}
                  disabled={selectedIds.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedIds.length})
                </Button>
                <Button
                  onClick={handleUploadToDrive}
                  disabled={selectedIds.length === 0}
                  variant="outline"
                >
                  <Cloud className="h-4 w-4 mr-2" /> Sync to Cloud ({selectedIds.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Create Project Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="project-name">Project name</label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="New Wallpaper"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="device-selector" 
                  checked={useDeviceSelector} 
                  onCheckedChange={(checked) => setUseDeviceSelector(!!checked)}
                />
                <Label htmlFor="device-selector" className="text-sm font-medium cursor-pointer">
                  Set bounds by device
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="gyro-enabled" 
                  checked={gyroEnabled} 
                  onCheckedChange={(checked) => setGyroEnabled(!!checked)}
                />
                <Label htmlFor="gyro-enabled" className="text-sm font-medium cursor-pointer">
                  [BETA] Enable Gyro (Parallax Effect)
                </Label>
              </div>
              
              {useDeviceSelector ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="device-select">Device</label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger id="device-select">
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">iPhone</div>
                      {getDevicesByCategory('iPhone').map((device) => (
                        <SelectItem key={device.name} value={device.name}>
                          {device.name} ({device.width} × {device.height})
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">iPad</div>
                      {getDevicesByCategory('iPad').map((device) => (
                        <SelectItem key={device.name} value={device.name}>
                          {device.name} ({device.width} × {device.height})
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">iPod touch</div>
                      {getDevicesByCategory('iPod touch').map((device) => (
                        <SelectItem key={device.name} value={device.name}>
                          {device.name} ({device.width} × {device.height})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">390 × 844 is the most compatible and default for iPhones.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="root-width">Width (px)</label>
                    <Input
                      id="root-width"
                      type="number"
                      min={1}
                      value={rootWidth}
                      onChange={(e) => setRootWidth(Number(e.target.value))}
                      onKeyDown={handleKeyPress}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="root-height">Height (px)</label>
                    <Input
                      id="root-height"
                      type="number"
                      min={1}
                      value={rootHeight}
                      onChange={(e) => setRootHeight(Number(e.target.value))}
                      onKeyDown={handleKeyPress}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={createProjectFromDialog}
                disabled={!newProjectName.trim() || (!useDeviceSelector && (!Number.isFinite(rootWidth) || !Number.isFinite(rootHeight) || rootWidth <= 0 || rootHeight <= 0))}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Projects List */
        }
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Your Projects ({filteredProjects.length}
            {query || dateFilter !== "all" ? ` of ${projectsArray.length}` : ""})
          </h2>
          
          {projectsArray.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects yet. Create your first project to get started!</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects match your search/filter.</p>
              {(query || dateFilter !== "all") && (
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuery("")}>Clear search</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateFilter("all")}>Reset date</Button>
                </div>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.slice(0, visibleCount).map((project) => {
                const isSelected = selectedIds.includes(project.id);
                const pv = previews[project.id];
                const doc = thumbDocs[project.id] ?? { meta: { width: pv?.width || project.width || 390, height: pv?.height || project.height || 844, background: pv?.bg || '#e5e7eb' }, layers: [] } as any;
                return (
                  <Card 
                    key={project.id} 
                    className={`relative p-0 ${isSelectMode && isSelected ? 'border-accent ring-2 ring-accent/30' : ''}`}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleSelection(project.id);
                      } else {
                        openProject(project);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      {/* Selection checkmark */}
                      {isSelectMode && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full border flex items-center justify-center bg-background/70">
                          {isSelected && <Check className="h-4 w-4 text-accent" />}
                        </div>
                      )}
                      {/* Preview thumbnail square */}
                      <div className="mb-3 overflow-hidden rounded-md border bg-background">
                        <AspectRatio ratio={1}>
                          <ProjectThumb
                            doc={thumbDocs[project.id]}
                            width={pv?.width || project.width || 390}
                            height={pv?.height || project.height || 844}
                            background={pv?.bg || '#e5e7eb'}
                            freeze={isRenameOpen}
                          />
                        </AspectRatio>
                      </div>
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectMode) {
                              toggleSelection(project.id);
                            } else {
                              openProject(project);
                            }
                          }}
                        >
                          <h3 className="font-medium block truncate" title={project.name}>
                            {renderHighlighted(project.name, query)}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {project.storageLocation === 'Device and Cloud' ? (
                              <>
                                <div className="flex items-center gap-0.5">
                                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                                  <Cloud className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {project.needsSync ? 'Out of sync' : 'Saved to Device and Cloud'}
                                </span>
                              </>
                            ) : project.storageLocation === 'Cloud' ? (
                              <>
                                <Cloud className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Saved to Cloud</span>
                              </>
                            ) : (
                              <>
                                <HardDrive className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Saved to Device</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* actions menu */}
                        <div className="ml-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={`h-8 w-8 ${isSelectMode ? 'opacity-50 pointer-events-none' : ''}`}
                                disabled={isSelectMode}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEditing(project); }}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              {project.storageLocation !== 'Cloud' && (
                                <DropdownMenuItem onClick={async (e) => {
                                  e.stopPropagation();
                                  await syncSingleProject(project.id);
                                }}>
                                  <Cloud className="h-4 w-4 mr-2" />
                                  Sync to Cloud
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => { e.stopPropagation(); confirmDelete(project); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {/* Open Project */}
                      <div className="mt-2">
                        <Button
                          className={`w-full justify-center ${isSelectMode ? 'opacity-50 pointer-events-none' : ''}`}
                          disabled={isSelectMode}
                          onClick={(e) => { e.stopPropagation(); openProject(project); }}
                        >
                          Open Project <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {visibleCount < filteredProjects.length && (
                <>
                  <div className="col-span-full flex items-center justify-center text-xs text-muted-foreground py-3">
                    Loading more...
                  </div>
                  <div ref={sentinelRef} className="col-span-full h-1" />
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {filteredProjects.slice(0, visibleCount).map((project) => {
                const isSelected = selectedIds.includes(project.id);
                const pv = previews[project.id];
                const doc = thumbDocs[project.id] ?? { meta: { width: pv?.width || project.width || 390, height: pv?.height || project.height || 844, background: pv?.bg || '#e5e7eb' }, layers: [] } as any;
                return (
                  <Card 
                    key={project.id} 
                    className={`relative p-0 ${isSelectMode && isSelected ? 'border-accent ring-2 ring-accent/30' : ''}`}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleSelection(project.id);
                      } else {
                        openProject(project);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-4 items-center">
                          {isSelectMode && (
                            <div className="flex-shrink-0 h-6 w-6 rounded-full border flex items-center justify-center">
                              {isSelected && <Check className="h-4 w-4 text-accent" />}
                            </div>
                          )}
                          <div className="flex-shrink-0 w-20 h-20 overflow-hidden rounded-md border bg-background">
                            <ProjectThumb
                              doc={thumbDocs[project.id]}
                              width={pv?.width || project.width || 390}
                              height={pv?.height || project.height || 844}
                              background={pv?.bg || '#e5e7eb'}
                              freeze={isRenameOpen}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate" title={project.name}>
                              {renderHighlighted(project.name, query)}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {new Date(project.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {project.storageLocation === 'Device and Cloud' ? (
                                <>
                                  <div className="flex items-center gap-0.5">
                                    <HardDrive className="h-3 w-3 text-muted-foreground" />
                                    <Cloud className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {project.needsSync ? 'Out of sync' : 'Saved to Device and Cloud'}
                                  </span>
                                </>
                              ) : project.storageLocation === 'Cloud' ? (
                                <>
                                  <Cloud className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Saved to Cloud</span>
                                </>
                              ) : (
                                <>
                                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Saved to Device</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-8 w-8 ${isSelectMode ? 'opacity-50 pointer-events-none' : ''}`}
                                  disabled={isSelectMode}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEditing(project); }}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                {project.storageLocation !== 'Cloud' && (
                                  <DropdownMenuItem onClick={async (e) => {
                                    e.stopPropagation();
                                    await syncSingleProject(project.id);
                                  }}>
                                    <Cloud className="h-4 w-4 mr-2" />
                                    Sync to Cloud
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); confirmDelete(project); }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className={`flex-1 ${isSelectMode ? 'opacity-50 pointer-events-none' : ''}`}
                            disabled={isSelectMode}
                            onClick={(e) => { e.stopPropagation(); openProject(project); }}
                          >
                            Open <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {visibleCount < filteredProjects.length && (
                <>
                  <div className="flex items-center justify-center text-xs text-muted-foreground py-3">
                    Loading more projects…
                  </div>
                  <div ref={sentinelRef} className="h-8" />
                </>
              )}
            </div>
          )}
        </div>

        {/* Rename Project Dialog */}
        <Dialog open={isRenameOpen} onOpenChange={(open) => { setIsRenameOpen(open); if (!open) { setEditingProjectId(null); setEditingName(""); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
            </DialogHeader>
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') { setIsRenameOpen(false); setEditingProjectId(null); setEditingName(""); }
              }}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsRenameOpen(false); setEditingProjectId(null); setEditingName(""); }}>Cancel</Button>
              <Button onClick={saveEdit} disabled={!editingName.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import type */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose the type of file you want to import:
              </p>
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  onClick={handleImportCAClick}
                  className="w-full justify-start text-left py-8"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">Import .ca file</span>
                    <span className="text-xs text-muted-foreground">
                      Import a CoreAnimation package or zip file
                    </span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImportTendiesClick}
                  className="w-full justify-start text-left py-8"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">Import .tendies file</span>
                    <span className="text-xs text-muted-foreground">
                      Import a tendies wallpaper file
                    </span>
                  </div>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const p = projectsArray.find(p => p.id === pendingDeleteId);
                  return (
                    <span>
                      This action cannot be undone. This will permanently delete
                      {" "}
                      <span className="font-medium">{p?.name ?? "this project"}</span>.
                    </span>
                  );
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (pendingDeleteId) {
                    handleDeleteProject(pendingDeleteId);
                  }
                  setPendingDeleteId(null);
                  setIsDeleteOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete options */}
        <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {selectedIds.length} Selected Projects</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose where to delete the selected projects from:
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bulk-delete-device" 
                    checked={deleteFromDevice}
                    onCheckedChange={(checked) => setDeleteFromDevice(!!checked)}
                  />
                  <Label htmlFor="bulk-delete-device" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Delete from Device
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bulk-delete-cloud" 
                    checked={deleteFromCloud}
                    onCheckedChange={(checked) => setDeleteFromCloud(!!checked)}
                  />
                  <Label htmlFor="bulk-delete-cloud" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Delete from Cloud
                  </Label>
                </div>
              </div>
              {!deleteFromDevice && !deleteFromCloud && (
                <p className="text-sm text-amber-600">
                  Please select at least one location to delete from.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={performBulkDelete}
                disabled={!deleteFromDevice && !deleteFromCloud}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sync Progress Dialog */}
        <Dialog open={isSyncing} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Syncing to Cloud</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {syncProgress.current} of {syncProgress.total} projects
                  </span>
                  <span className="font-medium">
                    {Math.round((syncProgress.current / syncProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
              {syncProgress.projectName && (
                <p className="text-sm text-muted-foreground">
                  {syncProgress.projectName}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-t-transparent border-primary rounded-full animate-spin" />
                <span>Please wait...</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Options Dialog */}
        <Dialog open={deleteOptionsOpen} onOpenChange={setDeleteOptionsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete "{projectToDelete?.name}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                This project is stored on both your device and Google Drive. Choose where to delete it from:
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="delete-device" 
                    checked={deleteFromDevice}
                    onCheckedChange={(checked) => setDeleteFromDevice(!!checked)}
                  />
                  <Label htmlFor="delete-device" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Delete from Device
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="delete-cloud" 
                    checked={deleteFromCloud}
                    onCheckedChange={(checked) => setDeleteFromCloud(!!checked)}
                  />
                  <Label htmlFor="delete-cloud" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Delete from Google Drive
                  </Label>
                </div>
              </div>
              {!deleteFromDevice && !deleteFromCloud && (
                <p className="text-sm text-amber-600">
                  Please select at least one location to delete from.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOptionsOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={performDeleteWithOptions}
                disabled={!deleteFromDevice && !deleteFromCloud}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sync Result Dialog */}
        <AlertDialog open={syncResultOpen} onOpenChange={setSyncResultOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sync Complete</AlertDialogTitle>
              <AlertDialogDescription>
                {syncResultMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setSyncResultOpen(false)}>
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* accept tos or go away when signed out */}
        <AlertDialog open={isTosOpen && !isSignedIn}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Agree to Terms of Service</AlertDialogTitle>
              <AlertDialogDescription>
                Please review and accept our
                {" "}
                <Link href="/tos" className="underline" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>
                {" "}
                to use Projects while signed out. Your projects are stored locally on your device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsTosOpen(false)
                  router.push("/")
                }}
              >
                Back
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  try { localStorage.setItem("caplayground-tos-accepted", "true") } catch {}
                  setIsTosOpen(false)
                }}
              >
                I Agree              
                </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Message Dialog */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{messageDialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {messageDialogContent}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setMessageDialogOpen(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col gap-4 pt-6">
            <h1 className="font-sfpro text-3xl md:text-4xl font-bold">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
