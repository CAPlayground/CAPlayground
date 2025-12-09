import { CAProjectBundle, AnyLayer } from './types';
import { parseCAML, parseStates, parseStateOverrides, parseStateTransitions, parseWallpaperParallaxGroups } from './caml';
import { serializeCAML } from './serialize/serializeCAML';

const INDEX_XML_BASENAME = 'index.xml';
const DEFAULT_SCENE = 'main.caml';

function formatXml(xml: string): string {
  const normalized = xml.replace(/\?>\s*</, '?>\n<');
  const reg = /(>)(<)(\/*)/g;
  const xmlWithBreaks = normalized.replace(reg, '$1\n$2$3');
  let pad = 0;
  const lines = xmlWithBreaks.split('\n');
  const formatted = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      let indentChange = 0;
      if (/^<\/.+>/.test(line)) {
        pad = Math.max(pad - 1, 0);
      } else if (/^<[^!?][^>]*[^\/]>$/.test(line)) {
        indentChange = 1;
      } else if (/^<[^!?].*\/>$/.test(line)) {
        indentChange = 0;
      } else if (/^<\?xml/.test(line) || /^<!/.test(line)) {
        indentChange = 0;
      } else if (/^<[^>]+>.*<\/[^>]+>$/.test(line)) {
        indentChange = 0;
      }
      const indented = `${'  '.repeat(pad)}${line}`;
      pad += indentChange;
      return indented;
    })
    .join('\n');
  return formatted + '\n';
}

export type DualCABundle = {
  project: { width: number; height: number; geometryFlipped: 0 | 1 };
  floating: Omit<CAProjectBundle, 'project'>;
  background: Omit<CAProjectBundle, 'project'>;
};

export type TendiesBundle = {
  project: { width: number; height: number; geometryFlipped: 0 | 1 };
  floating?: Omit<CAProjectBundle, 'project'>;
  background?: Omit<CAProjectBundle, 'project'>;
  wallpaper?: Omit<CAProjectBundle, 'project'>;
};

// Import a .zip containing both Background.ca and Floating.ca. If both are not present, throw an error.
export async function unpackDualCAZip(file: Blob): Promise<DualCABundle> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const paths = Object.keys(zip.files).map(p => p.replace(/\\/g, '/'));
  const findDir = (needle: 'Floating.ca' | 'Background.ca') => {
    const nl = needle.toLowerCase();
    // Find a path that contains a segment exactly matching needle (case-insensitive)
    const candidate = paths.find((p) => p.toLowerCase().split('/').includes(nl));
    if (!candidate) return null;
    const parts = candidate.split('/');
    const idx = parts.map(s => s.toLowerCase()).lastIndexOf(nl);
    if (idx < 0) return null;
    const dir = parts.slice(0, idx + 1).join('/') + '/';
    return dir;
  };
  const floatingDir = findDir('Floating.ca');
  const backgroundDir = findDir('Background.ca');
  if (!floatingDir || !backgroundDir) {
    throw new Error('UNSUPPORTED_ZIP_STRUCTURE: Expected Background.ca and Floating.ca');
  }

  const readDoc = async (baseDir: string) => {
    const norm = (p: string) => p.replace(/\\/g, '/');
    const byLower = new Map(paths.map((p) => [p.toLowerCase(), p] as const));
    const get = (rel: string) => {
      const full = norm(`${baseDir}${rel}`);
      const hit = byLower.get(full.toLowerCase());
      return zip.file(hit || full);
    };
    // index
    let indexXml = await get('index.xml')?.async('string');
    if (!indexXml) indexXml = await get('Index.xml')?.async('string');
    const rootDoc = indexXml ? parseIndexXml(indexXml) : null;
    const sceneName = (rootDoc || DEFAULT_SCENE).trim();
    // main caml
    let camlEntry = get(sceneName);
    if (!camlEntry) {
      const base = sceneName.split('/').pop() || sceneName;
      const candidate = paths.find((p) => p.toLowerCase().startsWith(baseDir.toLowerCase()) && (p.split('/').pop() || '') === base);
      if (candidate) camlEntry = zip.file(candidate);
    }
    if (!camlEntry) throw new Error(`Missing CAML in ${baseDir}`);
    const camlStrOriginal = await camlEntry.async('string');
    const { xml: camlStr, assets: inlineAssets } = await extractInlineAssetsToFiles(camlStrOriginal);
    const root = parseCAML(camlStr);
    const states = parseStates(camlStr);
    const stateOverrides = parseStateOverrides(camlStr);
    const stateTransitions = parseStateTransitions(camlStr);
    const assets: CAProjectBundle['assets'] = {};
    for (const p of paths) {
      if (!p.toLowerCase().startsWith(baseDir.toLowerCase())) continue;
      const entry = zip.files[p];
      if (!entry || entry.dir) continue;
      if (!/(^|\/)assets\//i.test(p)) continue;
      const fileObj = zip.file(p);
      if (!fileObj) continue;
      const data = await fileObj.async('blob');
      const afterAssets = p.split(/assets\//i)[1] || '';
      const filename = (afterAssets.split('/').pop() || '').trim();
      if (!filename) continue;
      if (data && data.size > 0 && !assets[filename]) assets[filename] = { path: `assets/${filename}`, data };
    }
    try {
      for (const [name, info] of Object.entries(inlineAssets || {})) {
        if (!assets[name]) assets[name] = { path: (info as any).path, data: (info as any).data };
      }
    } catch { }
    return { root, states, stateOverrides, stateTransitions, assets } as Omit<CAProjectBundle, 'project'>;
  };

  const floating = await readDoc(floatingDir);
  const background = await readDoc(backgroundDir);

  const width = Math.max(0, (floating.root as AnyLayer)?.size?.w || (background.root as AnyLayer)?.size?.w || 390);
  const height = Math.max(0, (floating.root as AnyLayer)?.size?.h || (background.root as AnyLayer)?.size?.h || 844);
  const geom = (((floating.root as any)?.geometryFlipped ?? (background.root as any)?.geometryFlipped) ?? 0) as 0 | 1;

  return {
    project: { width, height, geometryFlipped: geom },
    floating,
    background,
  };
}

function buildIndexXml(rootDocument: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>rootDocument</key>\n  <string>${rootDocument}</string>\n</dict>\n</plist>`;
}

function parseIndexXml(xml: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const el = doc.getElementsByTagName('rootDocument')[0];
    if (el && el.textContent) return el.textContent.trim();

    const keys = Array.from(doc.getElementsByTagName('key'));
    for (const k of keys) {
      if ((k.textContent || '').trim() === 'rootDocument') {
        let vEl: Element | null = null;
        vEl = (k.nextElementSibling as Element | null);
        let s: Element | null = vEl;
        while (s && s.tagName.toLowerCase() !== 'string') s = s.nextElementSibling as Element | null;
        const txt = (s && s.textContent) ? s.textContent.trim() : (vEl && vEl.textContent ? vEl.textContent.trim() : '');
        if (txt) return txt;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function dataURLToBlob(dataURL: string): Promise<Blob> {
  try {
    const res = await fetch(dataURL);
    return await res.blob();
  } catch {
    try {
      const [meta, data] = dataURL.split(',');
      const isBase64 = /;base64/i.test(meta);
      const mimeMatch = meta.match(/^data:([^;]+)(;base64)?/i);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      if (isBase64) {
        const byteString = atob(data);
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        return new Blob([ia], { type: mime });
      } else {
        return new Blob([decodeURIComponent(data)], { type: mime });
      }
    } catch {
      return new Blob([]);
    }
  }
}

function mimeToExt(mime?: string): string {
  if (!mime) return 'bin';
  const m = mime.toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('svg')) return 'svg';
  return 'bin';
}

async function extractInlineAssetsToFiles(xml: string): Promise<{ xml: string; assets: Record<string, { path: string; data: Blob }> }> {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const outAssets: Record<string, { path: string; data: Blob }> = {};
    let counter = 0;
    const ensureUniqueName = (base: string): string => {
      let name = base;
      while (outAssets[name]) {
        const i = ++counter;
        const idx = base.lastIndexOf('.');
        if (idx > 0) name = `${base.slice(0, idx)}_${i}${base.slice(idx)}`;
        else name = `${base}_${i}`;
      }
      return name;
    };

    const replaceSrc = async (el: Element, attrName: string) => {
      const src = el.getAttribute(attrName) || '';
      if (!/^data:/i.test(src)) return;
      try {
        const blob = await dataURLToBlob(src);
        const meta = src.slice(0, src.indexOf(','));
        const mimeMatch = meta.match(/^data:([^;]+)(;base64)?/i);
        const ext = mimeToExt(mimeMatch ? mimeMatch[1] : undefined);
        const uid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const filename = ensureUniqueName(`inline_${uid}.${ext}`);
        el.setAttribute(attrName, `assets/${filename}`);
        outAssets[filename] = { path: `assets/${filename}`, data: blob };
      } catch {
      }
    };

    const cgImages = Array.from(doc.getElementsByTagName('CGImage')) as Element[];
    for (const img of cgImages) {
      await replaceSrc(img, 'src');
    }

    const contents = Array.from(doc.getElementsByTagName('contents')) as Element[];
    for (const c of contents) {
      const t = (c.getAttribute('type') || '').toLowerCase();
      if (t === 'cgimage' && c.hasAttribute('src')) {
        await replaceSrc(c, 'src');
      }
    }

    const newXml = new XMLSerializer().serializeToString(doc);
    return { xml: newXml, assets: outAssets };
  } catch {
    return { xml, assets: {} };
  }
}

export async function packCA(bundle: CAProjectBundle): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Files need to be in root not [project-name]/ :p
  const makeGeneratedTransitions = () => {
    const states = (bundle.states || []).filter((n) => !/^base(\s*state)?$/i.test((n || '').trim()));
    const overrides = bundle.stateOverrides || {};
    const anyProvided = Array.isArray(bundle.stateTransitions) && bundle.stateTransitions.length > 0;
    if (anyProvided) return bundle.stateTransitions;
    const gens: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }> }> = [];
    const ensure = (fromState: string, toState: string) => {
      let tr = gens.find((t) => t.fromState === fromState && t.toState === toState);
      if (!tr) { tr = { fromState, toState, elements: [] }; gens.push(tr); }
      return tr;
    };
    for (const s of states) {
      const list = overrides[s] || [];
      if (!list.length) continue;
      for (const ov of list) {
        const anim = { type: 'CASpringAnimation', damping: 50, mass: 2, stiffness: 300, velocity: 0, duration: 0.8, fillMode: 'backwards', keyPath: ov.keyPath };
        ensure('*', s).elements.push({ targetId: ov.targetId, keyPath: ov.keyPath, animation: anim });
        ensure(s, '*').elements.push({ targetId: ov.targetId, keyPath: ov.keyPath, animation: anim });
      }
    }
    for (const s of states) {
      if (!gens.find(g => g.fromState === '*' && g.toState === s)) gens.push({ fromState: '*', toState: s, elements: [] });
      if (!gens.find(g => g.fromState === s && g.toState === '*')) gens.push({ fromState: s, toState: '*', elements: [] });
    }
    return gens;
  };

  const generatedTransitions = makeGeneratedTransitions();
  const camlRaw = serializeCAML(
    bundle.root,
    bundle.project,
    bundle.states,
    bundle.stateOverrides,
    generatedTransitions,
  );
  const caml = formatXml(camlRaw);
  zip.file(DEFAULT_SCENE, caml);

  zip.file(INDEX_XML_BASENAME, buildIndexXml(DEFAULT_SCENE));

  // Add assetManifest.caml file, i think this is needed bc my other working tendies have it :p
  const assetManifestContent = `<?xml version="1.0" encoding="UTF-8"?>

<caml xmlns="http://www.apple.com/CoreAnimation/1.0">
  <MicaAssetManifest>
    <modules type="NSArray"/>
  </MicaAssetManifest>
</caml>`;
  zip.file('assetManifest.caml', assetManifestContent);

  const assets = bundle.assets || {};
  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    for (const [name, asset] of Object.entries(assets)) {
      const data = (asset.data instanceof Blob)
        ? await asset.data.arrayBuffer()
        : (asset.data as ArrayBuffer | string);
      assetsFolder.file(name, data as any);
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return new Blob([blob], { type: 'application/zip' });
}

export async function unpackCA(file: Blob): Promise<CAProjectBundle> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  let indexXml = await zip.file(INDEX_XML_BASENAME)?.async('string');
  if (!indexXml) indexXml = await zip.file('Index.xml')?.async('string');
  if (!indexXml) indexXml = await zip.file('index.plist')?.async('string');

  if (!indexXml) {
    const files = Object.keys(zip.files);
    const indexFile = files.find(f => f.endsWith('index.xml') || f.endsWith('Index.xml'));
    if (indexFile) indexXml = await zip.file(indexFile)?.async('string');
  }

  const rootDoc = indexXml ? parseIndexXml(indexXml) : null;
  const sceneName = (rootDoc || DEFAULT_SCENE).trim();

  let camlFile = zip.file(sceneName);
  if (!camlFile) {
    const files = Object.keys(zip.files);
    const basename = sceneName.split('/')?.pop() || sceneName;
    const candidate = files.find((f) => (f.split('/')?.pop() || f) === basename);
    if (candidate) camlFile = zip.file(candidate);
  }
  if (!camlFile) {
    const anyCaml = Object.keys(zip.files).find((f) => {
      const lf = f.toLowerCase();
      return lf.endsWith('.caml') || lf.endsWith('.xml');
    });
    if (anyCaml) camlFile = zip.file(anyCaml);
  }
  const camlStrOriginal = camlFile ? await camlFile.async('string') : null;
  if (!camlStrOriginal) throw new Error('CAML scene not found in package');

  const { xml: camlStr, assets: inlineAssets } = await extractInlineAssetsToFiles(camlStrOriginal);

  const root = parseCAML(camlStr);
  if (!root) throw new Error('Failed to parse CAML');
  const states = parseStates(camlStr);
  const stateOverrides = parseStateOverrides(camlStr);
  const stateTransitions = parseStateTransitions(camlStr);
  const wallpaperParallaxGroups = parseWallpaperParallaxGroups(camlStr);

  const assets: CAProjectBundle['assets'] = {};
  try {
    const allPaths = Object.keys(zip.files);
    for (const p of allPaths) {
      const entry = zip.files[p];
      if (!entry || entry.dir) continue;
      if (!/(^|\/)assets\//i.test(p)) continue;
      const fileObj = zip.file(p);
      if (!fileObj) continue;
      const data = await fileObj.async('blob');
      const afterAssets = p.split(/assets\//i)[1] || '';
      const filename = (afterAssets.split('/').pop() || '').trim();
      if (!filename) continue;
      if (data && data.size > 0 && !assets[filename]) {
        assets[filename] = { path: `assets/${filename}`, data };
      }
    }
  } catch {
  }

  try {
    const inlineNames = Object.keys(inlineAssets || {});
    if (inlineNames.length) {
      for (const name of inlineNames) {
        const info = (inlineAssets as any)[name] as { path: string; data: Blob };
        if (!assets[name]) assets[name] = { path: info.path, data: info.data };
      }
      try { console.warn(`[import] Extracted ${inlineNames.length} inline image(s) from CAML into assets/`); } catch { }
    }
  } catch { }

  try {
    const doc = new DOMParser().parseFromString(camlStr, 'application/xml');
    const refNames = new Set<string>();
    // <CGImage src="assets/...">
    const cgImgs = Array.from(doc.getElementsByTagName('CGImage')) as Element[];
    for (const el of cgImgs) {
      const src = el.getAttribute('src') || '';
      if (/(^|\/)assets\//i.test(src)) {
        const name = (src.split(/assets\//i)[1] || '').split('/').pop() || '';
        if (name) refNames.add(name);
      }
    }
    // <contents type="CGImage" src="assets/...">
    const contentsEls = Array.from(doc.getElementsByTagName('contents')) as Element[];
    for (const c of contentsEls) {
      const t = (c.getAttribute('type') || '').toLowerCase();
      const src = c.getAttribute('src') || '';
      if (t === 'cgimage' && /(^|\/)assets\//i.test(src)) {
        const name = (src.split(/assets\//i)[1] || '').split('/').pop() || '';
        if (name) refNames.add(name);
      }
    }
    const have = new Set(Object.keys(assets));
    const missing = Array.from(refNames).filter(n => !have.has(n));
    if (missing.length) {
      try { console.warn(`[import] Missing ${missing.length} asset(s) referenced in CAML: ${missing.join(', ')}`); } catch { }
    }
  } catch { }

  const project = {
    id: crypto.randomUUID(),
    name: 'Imported Project',
    width: Math.max(0, root.size.w),
    height: Math.max(0, root.size.h),
    geometryFlipped: ((root as any).geometryFlipped ?? 0) as 0 | 1,
  };

  return { project, root, assets, states, stateOverrides, stateTransitions, wallpaperParallaxGroups };
}

export async function unpackTendies(file: Blob): Promise<TendiesBundle> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const paths = Object.keys(zip.files).map(p => p.replace(/\\/g, '/'));

  const hasMercuryPoster = paths.some(path =>
    path.toLowerCase().includes('com.apple.mercuryposter')
  );

  if (hasMercuryPoster) {
    throw new Error('MERCURY_POSTER_NOT_SUPPORTED: Mercury Poster wallpapers cannot be imported as their assets are stored in system files and cannot be modified.');
  }

  let floatingPath: string | null = null;
  let backgroundPath: string | null = null;
  let wallpaperPath: string | null = null;

  try {
    const plistPath = paths.find(p => p.toLowerCase().endsWith('wallpaper.plist'));
    if (plistPath) {
      const plistEntry = zip.file(plistPath);
      const xml = plistEntry ? await plistEntry.async('string') : null;
      if (xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const stringEls = Array.from(doc.getElementsByTagName('string')) as Element[];
        const caNames: string[] = [];
        for (const el of stringEls) {
          const text = (el.textContent || '').trim();
          if (!text.toLowerCase().endsWith('.ca')) continue;
          if (!caNames.includes(text)) caNames.push(text);
        }

        const resolveCaDir = (caRef: string): string | null => {
          const normRef = caRef.replace(/\\/g, '/');
          const lowerRef = normRef.toLowerCase();

          const direct = paths.find(p => p.toLowerCase().startsWith(lowerRef + '/'));
          if (direct) {
            const parts = direct.split('/');
            const idx = parts.findIndex(seg => seg.toLowerCase().endsWith('.ca'));
            if (idx >= 0) return parts.slice(0, idx + 1).join('/') + '/';
          }

          const base = normRef.split('/').pop() || normRef;
          const candidate = paths.find(p => {
            const segs = p.toLowerCase().split('/');
            return segs.some(seg => seg === base.toLowerCase());
          });
          if (!candidate) return null;
          const parts = candidate.split('/');
          const idx = parts.findIndex(seg => seg.toLowerCase().endsWith('.ca'));
          if (idx < 0) return null;
          return parts.slice(0, idx + 1).join('/') + '/';
        };

        const resolvedDirs: string[] = [];
        for (const caRef of caNames) {
          const dir = resolveCaDir(caRef);
          if (dir && !resolvedDirs.includes(dir)) resolvedDirs.push(dir);
        }

        if (resolvedDirs.length === 1) {
          wallpaperPath = resolvedDirs[0];
        } else if (resolvedDirs.length >= 2) {
          const pickBy = (keyword: string): string | null => {
            const hit = resolvedDirs.find(d => d.toLowerCase().includes(keyword));
            return hit || null;
          };

          floatingPath = pickBy('floating');
          backgroundPath = pickBy('background');
          wallpaperPath = pickBy('wallpaper.ca');

          const remaining = resolvedDirs.filter(d => d !== floatingPath && d !== backgroundPath && d !== wallpaperPath);
          const pickOr = (current: string | null, fallbackIndex: number): string | null => {
            if (current) return current;
            return resolvedDirs[fallbackIndex] || remaining[0] || null;
          };

          backgroundPath = pickOr(backgroundPath, 0);
          floatingPath = pickOr(floatingPath, 1);
          if (!wallpaperPath && resolvedDirs.length > 2) wallpaperPath = resolvedDirs[2];
        }
      }
    }
  } catch {
  }

  const findCAPath = (pattern: 'floating' | 'background' | 'wallpaper.ca'): string | null => {
    if (pattern === 'wallpaper.ca') {
      const candidate = paths.find((p) => {
        const segments = p.toLowerCase().split('/');
        return segments.some(seg => seg === 'wallpaper.ca');
      });
      if (!candidate) return null;
      const parts = candidate.split('/');
      const idx = parts.map(s => s.toLowerCase()).lastIndexOf('wallpaper.ca');
      if (idx < 0) return null;
      return parts.slice(0, idx + 1).join('/') + '/';
    } else {
      const candidate = paths.find((p) => {
        const segments = p.toLowerCase().split('/');
        return segments.some(seg => seg.includes(pattern) && seg.endsWith('.ca'));
      });
      if (!candidate) return null;
      const parts = candidate.split('/');
      const idx = parts.findIndex(seg => seg.toLowerCase().includes(pattern) && seg.toLowerCase().endsWith('.ca'));
      if (idx < 0) return null;
      return parts.slice(0, idx + 1).join('/') + '/';
    }
  };
  if (!floatingPath) floatingPath = findCAPath('floating');
  if (!backgroundPath) backgroundPath = findCAPath('background');
  if (!wallpaperPath) wallpaperPath = findCAPath('wallpaper.ca');

  if (!floatingPath && !backgroundPath && !wallpaperPath) {
    throw new Error('TENDIES_MISSING_CA_FILES: No floating.ca, background.ca, or wallpaper.ca found');
  }

  const readCADir = async (baseDir: string): Promise<Omit<CAProjectBundle, 'project'>> => {
    const norm = (p: string) => p.replace(/\\/g, '/');
    const byLower = new Map(paths.map((p) => [p.toLowerCase(), p] as const));
    const get = (rel: string) => {
      const full = norm(`${baseDir}${rel}`);
      const hit = byLower.get(full.toLowerCase());
      return zip.file(hit || full);
    };

    let indexXml = await get('index.xml')?.async('string');
    if (!indexXml) indexXml = await get('Index.xml')?.async('string');
    const rootDoc = indexXml ? parseIndexXml(indexXml) : null;
    const sceneName = (rootDoc || DEFAULT_SCENE).trim();

    let camlEntry = get(sceneName);
    if (!camlEntry) {
      const base = sceneName.split('/').pop() || sceneName;
      const candidate = paths.find((p) => p.toLowerCase().startsWith(baseDir.toLowerCase()) && (p.split('/').pop() || '') === base);
      if (candidate) camlEntry = zip.file(candidate);
    }
    if (!camlEntry) throw new Error(`Missing CAML in ${baseDir}`);

    const camlStrOriginal = await camlEntry.async('string');
    const { xml: camlStr, assets: inlineAssets } = await extractInlineAssetsToFiles(camlStrOriginal);
    const root = parseCAML(camlStr);
    if (!root) throw new Error(`Failed to parse CAML in ${baseDir}`);
    const states = parseStates(camlStr);
    const stateOverrides = parseStateOverrides(camlStr);
    const stateTransitions = parseStateTransitions(camlStr);
    const wallpaperParallaxGroups = parseWallpaperParallaxGroups(camlStr);

    const assets: CAProjectBundle['assets'] = {};
    for (const p of paths) {
      if (!p.toLowerCase().startsWith(baseDir.toLowerCase())) continue;
      const entry = zip.files[p];
      if (!entry || entry.dir) continue;
      if (!/(^|\/)assets\//i.test(p)) continue;
      const fileObj = zip.file(p);
      if (!fileObj) continue;
      const data = await fileObj.async('blob');
      const afterAssets = p.split(/assets\//i)[1] || '';
      const filename = (afterAssets.split('/').pop() || '').trim();
      if (!filename) continue;
      if (data && data.size > 0 && !assets[filename]) {
        assets[filename] = { path: `assets/${filename}`, data };
      }
    }

    try {
      for (const [name, info] of Object.entries(inlineAssets || {})) {
        if (!assets[name]) assets[name] = { path: (info as any).path, data: (info as any).data };
      }
    } catch { }

    return { root, states, stateOverrides, stateTransitions, wallpaperParallaxGroups, assets };
  };

  const floating = floatingPath ? await readCADir(floatingPath) : undefined;
  const background = backgroundPath ? await readCADir(backgroundPath) : undefined;
  const wallpaper = wallpaperPath ? await readCADir(wallpaperPath) : undefined;

  const anyRoot = (floating?.root || background?.root || wallpaper?.root) as AnyLayer | undefined;
  const width = Math.max(0, anyRoot?.size?.w || 390);
  const height = Math.max(0, anyRoot?.size?.h || 844);
  const geom = (((anyRoot as any)?.geometryFlipped) ?? 0) as 0 | 1;

  return {
    project: { width, height, geometryFlipped: geom },
    floating,
    background,
    wallpaper,
  };
}
