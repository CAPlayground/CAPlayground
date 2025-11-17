import { CAEmitterCell } from '@/components/editor/emitter/emitter';
import { AnyLayer, CAProject, TextLayer, VideoLayer, CAStateOverrides, CAStateTransitions, GyroParallaxDictionary, KeyPath, Animations, EmitterLayer, LayerBase, ReplicatorLayer } from './types';
import { blendModes } from '../blending';
import { Filter, SupportedFilterTypes } from '../filters';
import { findById } from '../editor/layer-utils';

const CAML_NS = 'http://www.apple.com/CoreAnimation/1.0';

function attr(node: Element, name: string): string | undefined {
  const v = node.getAttribute(name);
  return v === null ? undefined : v;
}

function directChildByTagNS(el: Element, tag: string): Element | undefined {
  const kids = Array.from(el.children) as Element[];
  return kids.find((c) => (c as any).namespaceURI === CAML_NS && c.localName === tag);
}
function directChildrenByTagNS(el: Element, tag: string): Element[] {
  const kids = Array.from(el.children) as Element[];
  return kids.filter((c) => (c as any).namespaceURI === CAML_NS && c.localName === tag);
}

function isTopLevelRoot(el: Element): boolean {
  const p = el.parentElement;
  return !!(p && (p as any).namespaceURI === CAML_NS && p.localName === 'caml');
}

function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function parseNumericAttr(element: Element, attrName: string, fallback?: number): number | undefined {
  const value = attr(element, attrName);
  if (!value) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseBooleanAttr(element: Element, attrName: string): 0 | 1 | undefined {
  const value = attr(element, attrName);
  if (value === undefined) return undefined;
  return (value === '1' || value === 'true') ? 1 : 0;
}

export function parseStateTransitions(xml: string): CAStateTransitions {
  const out: CAStateTransitions = [];
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return out;
    const transEl = caml.getElementsByTagNameNS(CAML_NS, 'stateTransitions')[0];
    if (!transEl) return out;
    const transNodes = Array.from(transEl.getElementsByTagNameNS(CAML_NS, 'LKStateTransition'));
    for (const tn of transNodes) {
      const fromState = tn.getAttribute('fromState') || '';
      const toState = tn.getAttribute('toState') || '';
      const elementsEl = tn.getElementsByTagNameNS(CAML_NS, 'elements')[0];
      const elements: any[] = [];
      if (elementsEl) {
        const elNodes = Array.from(elementsEl.getElementsByTagNameNS(CAML_NS, 'LKStateTransitionElement'));
        for (const en of elNodes) {
          const targetId = en.getAttribute('targetId') || '';
          const keyPath = en.getAttribute('key') || '';
          let animation: any = undefined;
          const animEl = en.getElementsByTagNameNS(CAML_NS, 'animation')[0];
          if (animEl) {
            const type = animEl.getAttribute('type') || '';
            animation = {
              type,
              damping: Number(animEl.getAttribute('damping') || '') || undefined,
              mass: Number(animEl.getAttribute('mass') || '') || undefined,
              stiffness: Number(animEl.getAttribute('stiffness') || '') || undefined,
              velocity: Number(animEl.getAttribute('velocity') || '') || undefined,
              duration: Number(animEl.getAttribute('duration') || '') || undefined,
              fillMode: animEl.getAttribute('fillMode') || undefined,
              keyPath: animEl.getAttribute('keyPath') || undefined,
            };
          }
          if (targetId && keyPath) elements.push({ targetId, keyPath, animation });
        }
      }
      out.push({ fromState, toState, elements });
    }
  } catch {
  }
  return out;
}

export function parseWallpaperParallaxGroups(xml: string): GyroParallaxDictionary[] {
  const result: GyroParallaxDictionary[] = [];
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return result;
    
    const rootLayer = caml.getElementsByTagNameNS(CAML_NS, 'CALayer')[0];
    if (!rootLayer) return result;
    
    const style = rootLayer.getElementsByTagNameNS(CAML_NS, 'style')[0];
    if (!style) return result;
    
    const wallpaperParallaxGroups = style.getElementsByTagNameNS(CAML_NS, 'wallpaperParallaxGroups')[0];
    if (!wallpaperParallaxGroups) return result;
    
    const dicts = Array.from(wallpaperParallaxGroups.getElementsByTagNameNS(CAML_NS, 'NSDictionary'));
    const layerNames = Array.from(doc.querySelectorAll('[name]:not([name=""])')).map((el) => el.getAttribute('name'));
    for (const dict of dicts) {
      const layerName = dict.getElementsByTagNameNS(CAML_NS, 'layerName')[0]?.getAttribute('value') || '';
      if (!layerNames.includes(layerName)) continue;
      const axis = dict.getElementsByTagNameNS(CAML_NS, 'axis')[0]?.getAttribute('value') || 'x';
      const image = dict.getElementsByTagNameNS(CAML_NS, 'image')[0]?.getAttribute('value') || 'null';
      const keyPath = dict.getElementsByTagNameNS(CAML_NS, 'keyPath')[0]?.getAttribute('value') || 'position.x';
      const mapMaxTo = Number(dict.getElementsByTagNameNS(CAML_NS, 'mapMaxTo')[0]?.getAttribute('value') || '0');
      const mapMinTo = Number(dict.getElementsByTagNameNS(CAML_NS, 'mapMinTo')[0]?.getAttribute('value') || '0');
      const title = dict.getElementsByTagNameNS(CAML_NS, 'title')[0]?.getAttribute('value') || '';
      const view = dict.getElementsByTagNameNS(CAML_NS, 'view')[0]?.getAttribute('value') || 'Floating';
      
      result.push({
        axis: axis as 'x' | 'y',
        image,
        keyPath: keyPath as any,
        layerName,
        mapMaxTo,
        mapMinTo,
        title,
        view,
      });
    }
  } catch {
    return [];
  }
  return result;
}

export function parseStateOverrides(xml: string): CAStateOverrides {
  const result: CAStateOverrides = {};
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return result;
    const wallpaperPropertyGroups = caml.getElementsByTagNameNS(CAML_NS, 'wallpaperPropertyGroups')[0];
    if (wallpaperPropertyGroups) {
      const dictionaries = wallpaperPropertyGroups.getElementsByTagNameNS(CAML_NS, 'NSDictionary');
      for (const dict of dictionaries) {
        const layerName = directChildByTagNS(dict, 'layerName')?.getAttribute('value') || '';
        const layer = doc.querySelector(`[name="${layerName}"]`);
        const targetId = layer?.getAttribute('id') || '';
        const keyPath = directChildByTagNS(dict, 'keyPath')?.getAttribute('value') || '';
        const lockedValue = directChildByTagNS(dict, 'v_lock')?.getAttribute('value') || '';
        const homeValue = directChildByTagNS(dict, 'v_home')?.getAttribute('value') || '';
        const sleepValue = directChildByTagNS(dict, 'v_sleep')?.getAttribute('value') || '';
        result.Locked = [...(result.Locked || []), { targetId, keyPath, value: Number(lockedValue) }];
        result.Unlock = [...(result.Unlock || []), { targetId, keyPath, value: Number(homeValue) }];
        result.Sleep = [...(result.Sleep || []), { targetId, keyPath, value: Number(sleepValue) }];
      }
    } else {
      const statesEl = caml.getElementsByTagNameNS(CAML_NS, 'states')[0];
      if (!statesEl) return result;
      const stateNodes = Array.from(statesEl.getElementsByTagNameNS(CAML_NS, 'LKState'));
      for (const stateNode of stateNodes) {
        const name = stateNode.getAttribute('name') || '';
        const elements = stateNode.getElementsByTagNameNS(CAML_NS, 'elements')[0];
        const arr: { targetId: string; keyPath: string; value: string | number }[] = [];
        if (elements) {
          const setNodes = Array.from(elements.getElementsByTagNameNS(CAML_NS, 'LKStateSetValue'));
          for (const sn of setNodes) {
            const targetId = sn.getAttribute('targetId') || '';
            const keyPath = sn.getAttribute('keyPath') || '';
            let val: string | number = '';
            const valueNodes = sn.getElementsByTagNameNS(CAML_NS, 'value');
            if (valueNodes && valueNodes[0]) {
              const type = valueNodes[0].getAttribute('type') || '';
              const vAttr = valueNodes[0].getAttribute('value') || '';
              if (vAttr === "undefined") {
                continue;
              }
              if (/^(integer|float|real|number)$/i.test(type)) {
                const n = Number(vAttr);
                val = Number.isFinite(n) ? n : vAttr;
              } else {
                val = vAttr;
              }
            }
            if (typeof val === 'number') {
              const kp = keyPath || '';
              if (kp === 'transform.rotation.z' || kp === 'transform.rotation.x' || kp === 'transform.rotation.y') {
                val = radToDeg(val);
              }
            }
            if (targetId && keyPath) arr.push({ targetId, keyPath, value: val });
          }
        }
        result[name] = arr;
      }
    }
  } catch {
    // ignore
  }
  return result;
}

function parseNumberList(input?: string): number[] {
  if (!input) return [];
  return input
    .split(/[;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
}

function floatsToHexColor(rgb: string | undefined): string | undefined {
  if (!rgb) return undefined;
  const parts = rgb.split(/[\s]+/).map((s) => Number(s));
  if (parts.length < 3) return undefined;
  const to255 = (f: number) => {
    const n = Math.max(0, Math.min(1, Number.isFinite(f) ? f : 0));
    return Math.round(n * 255);
  };
  const [r, g, b] = [to255(parts[0]), to255(parts[1]), to255(parts[2])];
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hexToForegroundColor(value?: string): string | undefined {
  if (!value) return undefined;
  const m = value.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return undefined;
  const hex = m[1].length === 6 ? m[1] : m[1].slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const toUnit = (n: number) => (n / 255);
  const fmt = (n: number) => {
    const s = (Math.round(n * 10000) / 10000).toString();
    return s;
  };
  return `${fmt(toUnit(r))} ${fmt(toUnit(g))} ${fmt(toUnit(b))}`;
}

export function parseCAML(xml: string): AnyLayer | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
  if (!caml) return null;
  let root = caml.getElementsByTagNameNS(CAML_NS, 'CALayer')[0];
  if (root.id === '__capRootLayer__') root = root.getElementsByTagNameNS(CAML_NS, 'CALayer')[0];
  if (!root) return null;
  return parseCALayer(root);
}

export function parseStates(xml: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return [];
    const wallpaperPropertyGroups = caml.getElementsByTagNameNS(CAML_NS, 'wallpaperPropertyGroups')[0];
    if (wallpaperPropertyGroups) {
      return ['Locked', 'Unlock', 'Sleep']
    }
    
    const statesEl = caml.getElementsByTagNameNS(CAML_NS, 'states')[0];
    if (!statesEl) return [];
    const arr: string[] = [];
    const nodes = Array.from(statesEl.getElementsByTagNameNS(CAML_NS, 'LKState'));
    for (const n of nodes) {
      const name = n.getAttribute('name');
      if (name && name.trim()) arr.push(name.trim());
    }
    return arr;
  } catch {
    return [];
  }
}

function parseLayerBase(el: Element): LayerBase {
  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Layer';
  const bounds = parseNumberList(attr(el, 'bounds'));
  const position = parseNumberList(attr(el, 'position'));
  const zPosition = parseNumericAttr(el, 'zPosition') || 0;
  const anchorPt = parseNumberList(attr(el, 'anchorPoint'));
  const cornerRadius = parseNumericAttr(el, 'cornerRadius') || 0;

  const rotationZ = parseNumericAttr(el, 'transform.rotation.z');
  const rotationX = parseNumericAttr(el, 'transform.rotation.x');
  const rotationY = parseNumericAttr(el, 'transform.rotation.y');

  const base: LayerBase = {
    id,
    name,
    position: { x: position[0] ?? 0, y: position[1] ?? 0 },
    size: { w: bounds[2] ?? 0, h: bounds[3] ?? 0 },
    zPosition,
    opacity: parseNumericAttr(el, 'opacity') || 1,
    cornerRadius,
    rotation: radToDeg(rotationZ || 0),
    rotationX: radToDeg(rotationX || 0),
    rotationY: radToDeg(rotationY || 0),
    anchorPoint: (anchorPt.length === 2 && (anchorPt[0] !== 0.5 || anchorPt[1] !== 0.5)) 
      ? { x: anchorPt[0], y: anchorPt[1] } 
      : undefined,
    geometryFlipped: parseBooleanAttr(el, 'geometryFlipped') || 0,
    masksToBounds: parseBooleanAttr(el, 'masksToBounds') || 0,
  };
  
  // Parse transform attribute for additional rotation values
  const transformAttr = attr(el, 'transform');
  if (transformAttr && /rotate\(/i.test(transformAttr)) {
    const rotations = parseTransformRotations(transformAttr);
    if (rotations.z !== undefined) base.rotation = base.rotation || rotations.z;
    if (rotations.x !== undefined) base.rotationX = base.rotationX || rotations.x;
    if (rotations.y !== undefined) base.rotationY = base.rotationY || rotations.y;
  }
  
  const compositingFilter = directChildByTagNS(el, 'compositingFilter');
  if (compositingFilter) {
    const blendMode = attr(compositingFilter, 'filter') || 'normal';
    const isSupported = blendModes[blendMode];
    if (isSupported) {
      base.blendMode = blendMode;
    }
  }

  const filters = directChildByTagNS(el, 'filters');
  if (filters) {
    const parsedFilters: Filter[] = []
    const caFilters = filters.getElementsByTagNameNS(CAML_NS, 'CAFilter');
    const cifilters = filters.getElementsByTagNameNS(CAML_NS, 'CIFilter');
    for (const caFilter of [...caFilters, ...cifilters]) {
      const filterType = attr(caFilter, 'filter');
      if (!filterType) continue;
      const filterName = attr(caFilter, 'name');
      const enabled = attr(caFilter, 'enabled') !== '0';
      let value = 0
      if (filterType === "gaussianBlur") {
        value = parseNumericAttr(caFilter, 'inputRadius') ?? 0;
      }
      if (filterType === "colorContrast" || filterType === "colorSaturate") {
        value = parseNumericAttr(caFilter, 'inputAmount') ?? 1;
      }
      if (filterType === "colorHueRotate") {
        value = radToDeg(parseNumericAttr(caFilter, 'inputAngle') ?? 0);
      }
      if (filterType === "CISepiaTone") {
        const inputIntensity = caFilter.getElementsByTagNameNS(CAML_NS, 'inputIntensity')[0];
        value = parseNumericAttr(inputIntensity, 'value') || 1;
      }
      parsedFilters.push({
        name: filterName || 'Filter',
        type: filterType as SupportedFilterTypes,
        enabled,
        value,
      });
    }

    base.filters = parsedFilters;
  }
  return base;
}

function parseTransformRotations(transformAttr: string): { x?: number; y?: number; z?: number } {
  const rotations: { x?: number; y?: number; z?: number } = {};
  
  try {
    const rx = /rotate\(([^)]+)\)/gi;
    let m: RegExpExecArray | null;
    
    while ((m = rx.exec(transformAttr)) !== null) {
      const inside = m[1].trim();
      const parts = inside.split(/\s*,\s*/);
      const angleStr = parts[0].trim();
      const angle = parseFloat(angleStr.replace(/deg/i, '').trim());
      const deg = Number.isFinite(angle) ? angle : 0;
      
      if (parts.length >= 4) {
        const ax = parseFloat(parts[1]);
        const ay = parseFloat(parts[2]);
        const az = parseFloat(parts[3]);
        
        if (Math.abs(ax - 1) < 1e-6 && Math.abs(ay) < 1e-6 && Math.abs(az) < 1e-6) {
          rotations.x = deg;
        } else if (Math.abs(ay - 1) < 1e-6 && Math.abs(ax) < 1e-6 && Math.abs(az) < 1e-6) {
          rotations.y = deg;
        } else if (Math.abs(az - 1) < 1e-6 && Math.abs(ax) < 1e-6 && Math.abs(ay) < 1e-6) {
          rotations.z = deg;
        }
      } else {
        rotations.z = deg;
      }
    }
  } catch {}
  
  return rotations;
}

function parseCAVideoLayer(el: Element): VideoLayer {
  const base = parseLayerBase(el);
  const children = parseSublayers(el);

  const frameCountAttr = attr(el, 'caplayFrameCount') || attr(el, 'caplay.frameCount');
  const fpsAttr = attr(el, 'caplayFPS') || attr(el, 'caplay.fps');
  const durationAttr = attr(el, 'caplayDuration') || attr(el, 'caplay.duration');
  const autoReversesAttr = attr(el, 'caplayAutoReverses') || attr(el, 'caplay.autoReverses');
  const prefixAttr = attr(el, 'caplayFramePrefix') || attr(el, 'caplay.framePrefix');
  const extAttr = attr(el, 'caplayFrameExtension') || attr(el, 'caplay.frameExtension');
  const syncWWithStateAttr = attr(el, 'caplaySyncWWithState')
  const syncStateFrameModeAttr = attr(el, 'caplaySyncStateFrameMode')

  let frameCount = frameCountAttr ? Number(frameCountAttr) : undefined;
  let fps = fpsAttr ? Number(fpsAttr) : undefined;
  let duration = durationAttr ? Number(durationAttr) : undefined;
  const autoReverses = autoReversesAttr === '1' || autoReversesAttr === 'true';
  const syncWWithState = syncWWithStateAttr === '1' || syncWWithStateAttr === 'true';
  const syncStateFrameMode = syncStateFrameModeAttr ? JSON.parse(syncStateFrameModeAttr) : {};

  const animationsEl = directChildByTagNS(el, 'animations');
  const animNode = animationsEl?.getElementsByTagNameNS(CAML_NS, 'animation')[0];
  const frameRefs: string[] = [];
  
  if (animNode) {
    const valuesNode = animNode.getElementsByTagNameNS(CAML_NS, 'values')[0];
    if (valuesNode) {
      const images = Array.from(valuesNode.getElementsByTagNameNS(CAML_NS, 'CGImage'));
      for (const img of images) {
        const src = attr(img, 'src');
        if (src) frameRefs.push(src);
      }
    }
    if (!frameCount && frameRefs.length > 0) {
      frameCount = frameRefs.length;
    }
    if (!duration) {
      const durAttr = animNode.getAttribute('duration');
      if (durAttr) duration = Number(durAttr);
    }
    const cm = (animNode.getAttribute('calculationMode') || '').toLowerCase();
    if (cm === 'linear' || cm === 'discrete') {
      (base as any).calculationMode = cm as 'linear' | 'discrete';
    }
  }

  const contents = directChildByTagNS(el, 'contents');
  const firstFrameEl = contents?.getElementsByTagNameNS(CAML_NS, 'CGImage')[0];
  const contentsSrcAttr = (contents && (contents.getAttribute('type') || '').toLowerCase() === 'cgimage')
    ? (contents.getAttribute('src') || undefined)
    : undefined;
  
  let framePrefix = prefixAttr || undefined;
  let frameExtension = extAttr || undefined;

  const firstReference = frameRefs[0] || (firstFrameEl ? attr(firstFrameEl, 'src') : undefined) || contentsSrcAttr;
  if (firstReference) {
    const fileName = firstReference.split('/').pop() || firstReference;
    const match = fileName.match(/^(.*?)(\d+)(\.[a-z0-9]+)$/i);
    if (match) {
      if (!framePrefix) framePrefix = match[1];
      if (!frameExtension) frameExtension = match[3];
    } else {
      if (!frameExtension && fileName.includes('.')) frameExtension = fileName.slice(fileName.lastIndexOf('.'));
      if (!framePrefix) framePrefix = fileName.replace(frameExtension ?? '', '');
    }
  }

  framePrefix = framePrefix || `${base.id}_frame_`;
  frameExtension = frameExtension || '.jpg';

  const layer: VideoLayer = {
    ...base,
    type: 'video',
    frameCount: Math.max(0, Math.floor(frameCount ?? 0)),
    ...(typeof fps === 'number' ? { fps } : {}),
    ...(typeof duration === 'number' ? { duration } : {}),
    autoReverses,
    framePrefix,
    frameExtension,
    syncWWithState,
    syncStateFrameMode,
    children,
  };

  return layer;
}

function parseCATextLayer(el: Element): AnyLayer {
  const base = parseLayerBase(el);
  const children = parseSublayers(el);

  const fontSizeAttr = attr(el, 'fontSize');
  const alignmentMode = attr(el, 'alignmentMode') as TextLayer['align'] | undefined;
  const wrappedAttr = attr(el, 'wrapped');
  let fontFamily: string | undefined;
  let textValue: string = '';
  const fontEl = el.getElementsByTagNameNS(CAML_NS, 'font')[0] as Element | undefined;
  if (fontEl) {
    fontFamily = fontEl.getAttribute('value') || undefined;
  }
  const stringEl = el.getElementsByTagNameNS(CAML_NS, 'string')[0] as Element | undefined;
  if (stringEl) {
    textValue = stringEl.getAttribute('value') || '';
  }
  const colorHex = floatsToHexColor(attr(el, 'foregroundColor'));

  const parsedAnimations = parseCALayerAnimations(el);

  const layer: AnyLayer = {
    ...base,
    type: 'text',
    text: textValue || '',
    fontFamily,
    fontSize: fontSizeAttr ? Number(fontSizeAttr) : undefined,
    color: colorHex,
    align: alignmentMode,
    wrapped: typeof wrappedAttr !== 'undefined' ? ((wrappedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
    children,
    ...(parsedAnimations ? { animations: parsedAnimations } : {} as any),
  } as AnyLayer;
  return layer;
}

function parseCAGradientLayer(el: Element): AnyLayer {
  const base = parseLayerBase(el);
  const children = parseSublayers(el);
  
  const startPointAttr = parseNumberList(attr(el, 'startPoint'));
  const endPointAttr = parseNumberList(attr(el, 'endPoint'));
  
  const startPoint = { x: startPointAttr[0] ?? 0, y: startPointAttr[1] ?? 0 };
  const endPoint = { x: endPointAttr[0] ?? 1, y: endPointAttr[1] ?? 1 };
  
  // Parse colors
  const colors: any[] = [];
  const colorsEl = el.getElementsByTagNameNS(CAML_NS, 'colors')[0] as Element | undefined;
  if (colorsEl) {
    const cgColors = directChildrenByTagNS(colorsEl, 'CGColor');
    for (const cgColor of cgColors) {
      const value = cgColor.getAttribute('value');
      const opacity = cgColor.getAttribute('opacity');
      const colorHex = floatsToHexColor(value || '');
      colors.push({
        color: colorHex || '#000000',
        opacity: opacity ? Number(opacity) : 1,
      });
    }
  }
  
  // Parse gradient type
  let gradientType: 'axial' | 'radial' | 'conic' = 'axial';
  const typeEl = el.getElementsByTagNameNS(CAML_NS, 'type')[0] as Element | undefined;
  if (typeEl) {
    const typeValue = typeEl.getAttribute('value');
    if (typeValue === 'radial' || typeValue === 'conic') {
      gradientType = typeValue;
    }
  }

  const parsedAnimations = parseCALayerAnimations(el);

  const layer: AnyLayer = {
    ...base,
    type: 'gradient',
    gradientType,
    startPoint,
    endPoint,
    colors,
    children,
    ...(parsedAnimations ? { animations: parsedAnimations } : {} as any),
  } as AnyLayer;
  
  return layer;
}

function parseCAEmitterLayer(el: Element): AnyLayer {
  const base = parseLayerBase(el);
  const emitterPosition = parseNumberList(attr(el, 'emitterPosition'));
  const emitterSize = parseNumberList(attr(el, 'emitterSize'));
  const renderMode = attr(el, 'renderMode') as 'unordered' | 'additive';
  const emitterShape = attr(el, 'emitterShape') as 'point' | 'line' | 'rectangle' | 'cuboid' | 'circle' | 'sphere';
  const emitterCellsEl = directChildByTagNS(el, 'emitterCells');
  const emitterMode = attr(el, 'emitterMode') as 'volume' | 'outline' | 'surface';
  const emitterCells = emitterCellsEl
    ? Array.from(emitterCellsEl.children).map((c) => {
        let imageSrc: string | undefined;
        const contents = c.getElementsByTagNameNS(CAML_NS, 'contents')[0];
        if (contents) {
          const images = contents.getElementsByTagNameNS(CAML_NS, 'CGImage');
          if (images && images[0]) {
            imageSrc = attr(images[0], 'src');
          } else {
            const t = (contents.getAttribute('type') || '').toLowerCase();
            const s = contents.getAttribute('src') || '';
            if (t === 'cgimage' && s) imageSrc = s;
          }
        }
        const newCell = new CAEmitterCell();
        newCell.id = String(attr(c, 'id') || crypto.randomUUID());
        newCell.src = imageSrc;
        newCell.birthRate = Number(attr(c, 'birthRate'));
        newCell.lifetime = Number(attr(c, 'lifetime'));
        newCell.velocity = Number(attr(c, 'velocity'));
        newCell.scale = Number(attr(c, 'scale'));
        newCell.scaleRange = Number(attr(c, 'scaleRange'));
        newCell.scaleSpeed = Number(attr(c, 'scaleSpeed'));
        newCell.alphaRange = Number(attr(c, 'alphaRange'));
        newCell.alphaSpeed = Number(attr(c, 'alphaSpeed'));
        newCell.emissionRange = radToDeg(Number(attr(c, 'emissionRange')) || 0);
        newCell.emissionLongitude = radToDeg(Number(attr(c, 'emissionLongitude')) || 0);
        newCell.emissionLatitude = radToDeg(Number(attr(c, 'emissionLatitude')) || 0);
        newCell.spin = radToDeg(Number(attr(c, 'spin')) || 0);
        newCell.spinRange = radToDeg(Number(attr(c, 'spinRange')) || 0);
        newCell.xAcceleration = Number(attr(c, 'xAcceleration'));
        newCell.yAcceleration = Number(attr(c, 'yAcceleration'));
        return newCell;
      })
    : [];

  return {
    ...base,
    type: 'emitter',
    emitterPosition: { x: emitterPosition[0] ?? 0, y: emitterPosition[1] ?? 0 },
    emitterSize: { w: emitterSize[0] ?? 0, h: emitterSize[1] ?? 0 },
    emitterShape,
    emitterMode,
    emitterCells,
    renderMode,
  } as AnyLayer;
}

function parseCATransformLayer(el: Element): AnyLayer {
  const base = parseLayerBase(el);
  const children = parseSublayers(el);
  
  return {
    ...base,
    type: 'transform',
    children,
  } as AnyLayer;
}

function parseCAReplicatorLayer(el: Element): AnyLayer {
  const base = parseLayerBase(el);
  const children = parseSublayers(el);
  
  const instanceCount = parseNumericAttr(el, 'instanceCount') || 1;
  const instanceDelay = parseNumericAttr(el, 'instanceDelay') || 0;
  
  // Parse instanceTransform attribute
  const instanceTransformAttr = attr(el, 'instanceTransform');
  let instanceTranslation = { x: 0, y: 0, z: 0 };
  let instanceRotation = 0;
  
  if (instanceTransformAttr) {
    // Parse translate(x, y, z)
    const translateMatch = instanceTransformAttr.match(/translate\s*\(\s*([^,)]+)\s*,\s*([^,)]+)\s*,\s*([^,)]+)\s*\)/);
    if (translateMatch) {
      instanceTranslation = {
        x: Number(translateMatch[1]) || 0,
        y: Number(translateMatch[2]) || 0,
        z: Number(translateMatch[3]) || 0,
      };
    }
    
    // Parse rotate(deg)
    const rotateMatch = instanceTransformAttr.match(/rotate\s*\(\s*([^)]+)deg\s*\)/);
    if (rotateMatch) {
      instanceRotation = Number(rotateMatch[1]) || 0;
    }
  }
  
  return {
    ...base,
    type: 'replicator',
    instanceCount,
    instanceTranslation,
    instanceRotation,
    instanceDelay,
    children,
  } as AnyLayer;
}

function parseSublayers(el: Element): AnyLayer[] {
  const sublayersEl = directChildByTagNS(el, 'sublayers');
  const children = [];
  if (sublayersEl) {
    for (const n of sublayersEl.children) {
      if (n.localName === 'CALayer') children.push(parseCALayer(n));
      else if (n.localName === 'CATextLayer') children.push(parseCATextLayer(n));
      else if (n.localName === 'CAGradientLayer') children.push(parseCAGradientLayer(n));
      else if (n.localName === 'CAEmitterLayer') children.push(parseCAEmitterLayer(n));
      else if (n.localName === 'CATransformLayer') children.push(parseCATransformLayer(n));
      else if (n.localName === 'CAReplicatorLayer') children.push(parseCAReplicatorLayer(n));
    }
  }
  return children;
}

function parseCALayer(el: Element): AnyLayer {
  const caplayKind = attr(el, 'caplayKind') || attr(el, 'caplay.kind');
  if (caplayKind === 'video') {
    return parseCAVideoLayer(el);
  }

  const layerBase = parseLayerBase(el);
  const children = parseSublayers(el);
  let backgroundColor: string | undefined = undefined;
  let backgroundOpacity: number | undefined = undefined;
  const bgAttr = attr(el, 'backgroundColor');
  if (bgAttr) backgroundColor = floatsToHexColor(bgAttr) || bgAttr || undefined;
  const bgChild = el.getElementsByTagNameNS(CAML_NS, 'backgroundColor')[0] as Element | undefined;
  if (bgChild) {
    const v = bgChild.getAttribute('value') || undefined;
    const op = bgChild.getAttribute('opacity');
    const hex = floatsToHexColor(v || '');
    if (hex) backgroundColor = hex;
    const opNum = typeof op === 'string' ? Number(op) : NaN;
    if (Number.isFinite(opNum)) backgroundOpacity = opNum;
  }
  const borderColorRaw = attr(el, 'borderColor');
  const borderColor = floatsToHexColor(borderColorRaw) || borderColorRaw || undefined;
  const borderWidth = attr(el, 'borderWidth') ? Number(attr(el, 'borderWidth')) : undefined;

  let imageSrc: string | undefined;
  const contents = directChildByTagNS(el, 'contents');
  if (contents) {
    const images = contents.getElementsByTagNameNS(CAML_NS, 'CGImage');
    if (images && images[0]) {
      imageSrc = attr(images[0], 'src');
    } else {
      const t = (contents.getAttribute('type') || '').toLowerCase();
      const s = contents.getAttribute('src') || '';
      if (t === 'cgimage' && s) imageSrc = s;
    }
  }
  let type = imageSrc ? 'image' : attr(el, 'type') || 'shape';
  const base = {
    ...layerBase,
    backgroundColor,
    backgroundOpacity,
    borderColor,
    borderWidth,
    src: imageSrc,
  } as const;

  const parsedAnimations = parseCALayerAnimations(el);

  return {
    ...base,
    type,
    children,
    ...(parsedAnimations ? { animations: parsedAnimations } : {}),
  } as AnyLayer;
}

export function serializeCAML(
  root: AnyLayer,
  project?: CAProject,
  stateNamesInput?: string[],
  stateOverridesInput?: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>,
  stateTransitionsInput?: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }>; }>,
  wallpaperParallaxGroupsInput?: GyroParallaxDictionary[]
): string {
  const doc = document.implementation.createDocument(CAML_NS, 'caml', null);
  const caml = doc.documentElement;
  const isWallpaperCA = root.children?.some((c) => c.name === 'BACKGROUND' || c.name === 'FLOATING');
  const capRootLayer: AnyLayer = {
    ...root,
    id: '__capRootLayer__',
    name: 'CAPlayground Root Layer',
    geometryFlipped: 0,
    children: [root],
  }

  const rootEl = serializeLayer(
    doc,
    isWallpaperCA ? root : capRootLayer,
    project,
    isWallpaperCA ? wallpaperParallaxGroupsInput : undefined,
    isWallpaperCA ? stateOverridesInput : undefined,
  );

  const scriptComponents = doc.createElementNS(CAML_NS, 'scriptComponents');
  const statesEl = doc.createElementNS(CAML_NS, 'states');
  const layerIndex: Record<string, AnyLayer> = {};
  const indexWalk = (l: AnyLayer) => {
    layerIndex[l.id] = l as AnyLayer;
    if (Array.isArray((l as any).children)) {
      ((l as any).children as AnyLayer[]).forEach(indexWalk);
    }
  };
  indexWalk(root);
  
  const filtered = (stateNamesInput || []).filter((n) => !/^base(\s*state)?$/i.test(n.trim()));
  const stateNames = (filtered.length ? filtered : ['Locked', 'Unlock', 'Sleep']);
  stateNames.forEach(stateName => {
    const state = doc.createElementNS(CAML_NS, 'LKState');
    state.setAttribute('name', stateName);
    const elements = doc.createElementNS(CAML_NS, 'elements');

    // state animations wont work unless every state overrides exists in every state. its really stupid and this next section of code should fix that problem when exporting from caplayground
    // - retronbv

    stateNames.forEach((stateName) => {
      let ovs = (stateOverridesInput || {})[stateName] || [];
      for (let override of ovs) {
        if (!layerIndex[override.targetId]) continue;
        let defaultVal: any;
        switch (override.keyPath) {
          case "position.x":
            defaultVal = layerIndex[override.targetId].position.x;
            break;
          case "position.y":
            defaultVal = layerIndex[override.targetId].position.y;
            break;
          case "bounds.size.width":
            defaultVal = layerIndex[override.targetId].size.w;
            break;
          case "bounds.size.height":
            defaultVal = layerIndex[override.targetId].size.h;
            break;
          case "transform.rotation.z":
            defaultVal = layerIndex[override.targetId].rotation;
            break;
          case "transform.rotation.x":
            defaultVal = (layerIndex as any)[override.targetId]?.rotationX;
            break;
          case "transform.rotation.y":
            defaultVal = (layerIndex as any)[override.targetId]?.rotationY;
            break;
          case "opacity":
            defaultVal = layerIndex[override.targetId].opacity;
            break;
          case "cornerRadius":
            defaultVal = (layerIndex as any)[override.targetId]?.cornerRadius;
            break;
          case "zPosition":
            defaultVal = (layerIndex as any)[override.targetId]?.zPosition;
            break;
        }
        stateNames.forEach((checkState) => {
          let checkOverrides = (stateOverridesInput || {})[checkState] || [];
          let filtered = checkOverrides.filter(
            (o) =>
              o.targetId == override.targetId && o.keyPath == override.keyPath
          );
          if (filtered.length == 0) {
            checkOverrides.push({
              targetId: override.targetId,
              keyPath: override.keyPath,
              value: defaultVal,
            });
          }
          (stateOverridesInput || {})[checkState] = checkOverrides;
        });
      }
    });

    const ovs = ((stateOverridesInput || {})[stateName] || []).filter((ov) => !!layerIndex[ov.targetId]);
    for (const ov of ovs) {
      const el = doc.createElementNS(CAML_NS, 'LKStateSetValue');
      el.setAttribute('targetId', ov.targetId);
      el.setAttribute('keyPath', ov.keyPath);
      const vEl = doc.createElementNS(CAML_NS, 'value');
      if (typeof ov.value === 'number') {
        let outVal = ov.value;
        if (ov.keyPath === 'transform.rotation.z') {
          outVal = Number((ov.value * Math.PI / 180).toFixed(5));
        }
        if (ov.keyPath === 'position.x' || ov.keyPath === 'position.y') {
          outVal = Math.round(outVal);
          vEl.setAttribute('type', 'integer');
        } else {
          const isInt = Number.isInteger(outVal);
          vEl.setAttribute('type', isInt ? 'integer' : 'real');
        }
        vEl.setAttribute('value', String(outVal));
      } else {
        vEl.setAttribute('type', 'string');
        vEl.setAttribute('value', String(ov.value));
      }
      el.appendChild(vEl);
      elements.appendChild(el);
    }
    state.appendChild(elements);
    statesEl.appendChild(state);
  });

  const stateTransitions = doc.createElementNS(CAML_NS, 'stateTransitions');
  const transitionsToWrite = (stateTransitionsInput && stateTransitionsInput.length
    ? stateTransitionsInput
    : [
        { fromState: '*', toState: 'Unlock', elements: [] },
        { fromState: 'Unlock', toState: '*', elements: [] },
        { fromState: '*', toState: 'Locked', elements: [] },
        { fromState: 'Locked', toState: '*', elements: [] },
        { fromState: '*', toState: 'Sleep', elements: [] },
        { fromState: 'Sleep', toState: '*', elements: [] },
      ]);

  transitionsToWrite.forEach((t) => {
    const transition = doc.createElementNS(CAML_NS, 'LKStateTransition');
    transition.setAttribute('fromState', t.fromState);
    transition.setAttribute('toState', t.toState);
    const elements = doc.createElementNS(CAML_NS, 'elements');
    for (const elSpec of (t.elements || [])) {
      const el = doc.createElementNS(CAML_NS, 'LKStateTransitionElement');
      el.setAttribute('targetId', elSpec.targetId);
      el.setAttribute('key', elSpec.keyPath);
      if (elSpec.animation) {
        const a = doc.createElementNS(CAML_NS, 'animation');
        if (elSpec.animation.type) a.setAttribute('type', String(elSpec.animation.type));
        if (typeof elSpec.animation.damping === 'number') a.setAttribute('damping', String(elSpec.animation.damping));
        if (typeof elSpec.animation.mass === 'number') a.setAttribute('mass', String(elSpec.animation.mass));
        if (typeof elSpec.animation.stiffness === 'number') a.setAttribute('stiffness', String(elSpec.animation.stiffness));
        if (typeof elSpec.animation.velocity === 'number') a.setAttribute('velocity', String(elSpec.animation.velocity));
        if (typeof elSpec.animation.duration === 'number') a.setAttribute('duration', String(elSpec.animation.duration));
        if (elSpec.animation.fillMode) a.setAttribute('fillMode', String(elSpec.animation.fillMode));
        if (elSpec.animation.keyPath) a.setAttribute('keyPath', String(elSpec.animation.keyPath));
        if (typeof (elSpec.animation as any).mica_autorecalculatesDuration !== 'undefined') a.setAttribute('mica_autorecalculatesDuration', String((elSpec.animation as any).mica_autorecalculatesDuration));
        el.appendChild(a);
      }
      elements.appendChild(el);
    }
    transition.appendChild(elements);
    stateTransitions.appendChild(transition);
  });

  // Append all elements
  const modules = doc.createElementNS(CAML_NS, 'modules');
  rootEl.appendChild(modules);
  if (!isWallpaperCA) {
    rootEl.appendChild(statesEl);
    rootEl.appendChild(stateTransitions);
  }
  caml.appendChild(rootEl);

  const xml = new XMLSerializer().serializeToString(doc);
  const formatted = formatXML(xml);
  const asciiArt = `<!--
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║                         CAPlayground                          ║
  ║                                                               ║
  ║      Create beautiful Core Animation wallpapers for iOS       ║
  ║                                                               ║
  ║          Website: https://caplayground.pages.dev              ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
-->`;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + asciiArt + '\n' + formatted;
}

function formatXML(xml: string): string {
  const PADDING = '  ';
  const reg = /(>)(<)(\/*)/g;
  let pad = 0;
  
  xml = xml.replace(reg, '$1\n$2$3');
  
  return xml.split('\n').map((node) => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (node.match(/^<\/\w/) && pad > 0) {
      pad -= 1;
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }
    
    const padding = PADDING.repeat(pad);
    pad += indent;
    
    return padding + node;
  }).join('\n');
}

function setAttr(el: Element, name: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === '') return;
  el.setAttribute(name, String(value));
}

function serializeLayer(
  doc: XMLDocument,
  layer: AnyLayer,
  project?: CAProject,
  wallpaperParallaxGroupsInput?: GyroParallaxDictionary[],
  stateOverridesInput?: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>,
): Element {
  const elementTypes: Record<string, string> = {
    text: 'CATextLayer',
    gradient: 'CAGradientLayer',
    emitter: 'CAEmitterLayer',
    transform: 'CATransformLayer',
    replicator: 'CAReplicatorLayer',
    default: 'CALayer',
  }

  const elementType = elementTypes[layer.type] || elementTypes[(layer as any)._displayType] || elementTypes.default;
  const el = doc.createElementNS(CAML_NS, elementType);
  setAttr(el, 'id', layer.id);
  setAttr(el, 'name', layer.name);
  setAttr(el, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  setAttr(el, 'position', `${Math.round(layer.position.x)} ${Math.round(layer.position.y)}`);
  setAttr(el, 'zPosition', layer.zPosition ?? 0);
  const ax = (layer as any).anchorPoint?.x;
  const ay = (layer as any).anchorPoint?.y;
  if (typeof ax === 'number' && typeof ay === 'number') {
    if (!(Math.abs(ax - 0.5) < 1e-6 && Math.abs(ay - 0.5) < 1e-6)) {
      setAttr(el, 'anchorPoint', `${ax} ${ay}`);
    }
  }
  if (layer.blendMode && layer.blendMode !== 'normal') {
    const compositingFilter = doc.createElementNS(CAML_NS, 'compositingFilter');
    compositingFilter.setAttribute('type', "CAFilter");
    compositingFilter.setAttribute('filter', layer.blendMode);
    compositingFilter.setAttribute('name', layer.blendMode);
    el.appendChild(compositingFilter);
  }
  
  if (layer.filters) {
    const filters = doc.createElementNS(CAML_NS, 'filters');
    for (const filter of layer.filters) {
      const filterEl = filter.type === "CISepiaTone"
        ? doc.createElementNS(CAML_NS, 'CIFilter')
        : doc.createElementNS(CAML_NS, 'CAFilter');
      filterEl.setAttribute('filter', filter.type);
      filterEl.setAttribute('name', filter.name);
      filterEl.setAttribute('enabled', String(filter.enabled));
      if (filter.type === "gaussianBlur") {
        filterEl.setAttribute('inputRadius', String(filter.value));
      }
      if (filter.type === "colorContrast" || filter.type === "colorSaturate") {
        filterEl.setAttribute('inputAmount', String(filter.value));
      }
      if (filter.type === "colorHueRotate") {
        const inputAngle = degToRad(filter.value);
        filterEl.setAttribute('inputAngle', String(inputAngle));
      }
      if (filter.type === "CISepiaTone") {
        const inputIntensity = doc.createElementNS(CAML_NS, 'inputIntensity')
        inputIntensity.setAttribute('type', 'real');
        inputIntensity.setAttribute('value', String(filter.value));
        filterEl.appendChild(inputIntensity);
      }
      filters.appendChild(filterEl);
    }
    el.appendChild(filters);
  }
  const gf = (layer as any).geometryFlipped;
  if (gf === 0 || gf === 1) setAttr(el, 'geometryFlipped', String(gf));
  const mtb = (layer as any).masksToBounds;
  if (mtb === 0 || mtb === 1) setAttr(el, 'masksToBounds', String(mtb));
  setAttr(el, 'opacity', layer.opacity ?? 1);
  const rotZ = (layer as any).rotation || 0;
  const rotX = (layer as any).rotationX || 0;
  const rotY = (layer as any).rotationY || 0;
  setAttr(el, 'transform.rotation.z', (rotZ * Math.PI) / 180);
  setAttr(el, 'transform.rotation.x', (rotX * Math.PI) / 180);
  setAttr(el, 'transform.rotation.y', (rotY * Math.PI) / 180);

  const parts: string[] = [];
  parts.push(`rotate(${rotZ || 0}deg)`);
  parts.push(`rotate(${rotY || 0}deg, 0, 1, 0)`);
  parts.push(`rotate(${rotX || 0}deg, 1, 0, 0)`);
  setAttr(el, 'transform', parts.join(' '));
  const explicitBgHex = (layer as any).backgroundColor as string | undefined;
  const shapeFillHex = (layer as any).fill as string | undefined;
  const bgHex = explicitBgHex ?? shapeFillHex;
  const bgOp = (layer as any).backgroundOpacity as number | undefined;
  if (bgHex) {
    const floatTriplet = hexToForegroundColor(bgHex);
    const op = typeof bgOp === 'number' ? Math.max(0, Math.min(1, bgOp)) : undefined;
    if (typeof op === 'number' && op < 1) {
      const bg = doc.createElementNS(CAML_NS, 'backgroundColor');
      if (floatTriplet) bg.setAttribute('value', floatTriplet);
      const op2 = Math.round(op * 100) / 100; // 2 d.p.
      bg.setAttribute('opacity', String(op2));
      el.appendChild(bg);
    } else {
      if (floatTriplet) setAttr(el, 'backgroundColor', floatTriplet);
    }
  }
  setAttr(el, 'cornerRadius', layer.cornerRadius);
  setAttr(el, 'borderColor', layer.borderColor);
  setAttr(el, 'borderWidth', layer.borderWidth);
  setAttr(el, 'allowsEdgeAntialiasing', '1');
  setAttr(el, 'allowsGroupOpacity', '1');
  setAttr(el, 'contentsFormat', 'RGBA8');
  setAttr(el, 'cornerCurve', 'circular');

  if (layer.type === 'image') {
    const contents = doc.createElementNS(CAML_NS, 'contents');
    const cg = doc.createElementNS(CAML_NS, 'CGImage');
    setAttr(cg, 'src', layer.src);
    contents.appendChild(cg);
    el.appendChild(contents);
  }

  if (layer.type === 'video') {
    const videoLayer = layer as VideoLayer;
    const frameCount = Math.max(0, Math.floor(videoLayer.frameCount || 0));
    const fps = typeof videoLayer.fps === 'number' && videoLayer.fps > 0 ? videoLayer.fps : 30;
    const duration = typeof videoLayer.duration === 'number' && videoLayer.duration > 0 ? videoLayer.duration : (frameCount / fps);
    const autoReverses = !!videoLayer.autoReverses;
    const syncWWithState = !!videoLayer.syncWWithState;
    const syncStateFrameMode = videoLayer.syncStateFrameMode || {};
    let framePrefix = videoLayer.framePrefix || `${layer.id}_frame_`;
    let frameExtension = videoLayer.frameExtension || '.jpg';
    if (!frameExtension.startsWith('.')) frameExtension = `.${frameExtension}`;
    const framePath = (idx: number) => `assets/${framePrefix}${idx}${frameExtension}`;

    setAttr(el, 'caplayKind', 'video');
    setAttr(el, 'caplayFrameCount', frameCount);
    setAttr(el, 'caplayFPS', fps);
    setAttr(el, 'caplayDuration', duration);
    setAttr(el, 'caplayAutoReverses', autoReverses ? 1 : 0);
    setAttr(el, 'caplayFramePrefix', framePrefix);
    setAttr(el, 'caplayFrameExtension', frameExtension);
    setAttr(el, 'caplaySyncWWithState', syncWWithState ? 1 : 0);
    setAttr(el, 'caplaySyncStateFrameMode', JSON.stringify(syncStateFrameMode));

    if (!syncWWithState) {
      if (frameCount > 0) {
        const contents = doc.createElementNS(CAML_NS, 'contents');
        contents.setAttribute('type', 'CGImage');
        contents.setAttribute('src', framePath(0));
        el.appendChild(contents);
      }
      
      if (frameCount > 1) {
        const animationsEl = doc.createElementNS(CAML_NS, 'animations');
        const a = doc.createElementNS(CAML_NS, 'animation');
        a.setAttribute('type', 'CAKeyframeAnimation');
        const calcMode = (layer as any).calculationMode === 'discrete' ? 'discrete' : 'linear';
        a.setAttribute('calculationMode', calcMode);
        a.setAttribute('keyPath', 'contents');
        a.setAttribute('beginTime', '1e-100');
        a.setAttribute('duration', String(duration));
        a.setAttribute('removedOnCompletion', '0');
        a.setAttribute('repeatCount', 'inf');
        a.setAttribute('repeatDuration', '0');
        a.setAttribute('speed', '1');
        a.setAttribute('timeOffset', '0');
        a.setAttribute('autoreverses', autoReverses ? '1' : '0');
        
        const valuesEl = doc.createElementNS(CAML_NS, 'values');
        for (let i = 0; i < frameCount; i++) {
          const cgImage = doc.createElementNS(CAML_NS, 'CGImage');
          cgImage.setAttribute('src', framePath(i));
          valuesEl.appendChild(cgImage);
        }
        
        a.appendChild(valuesEl);
        animationsEl.appendChild(a);
        el.appendChild(animationsEl);
      }
    }
  }

  if (layer.type === 'text') {
    const fg = hexToForegroundColor((layer as TextLayer).color || '#000000');
    setAttr(el, 'foregroundColor', fg);
    // font size
    setAttr(el, 'fontSize', (layer as TextLayer).fontSize ?? undefined);
    // alignment
    const align = (layer as TextLayer).align || 'left';
    const alignmentMode = align === 'justified' ? 'justified' : align;
    setAttr(el, 'alignmentMode', alignmentMode);
    // wrapping
    const wrapped = (layer as TextLayer).wrapped ?? 1;
    setAttr(el, 'wrapped', wrapped);
    setAttr(el, 'resizingMode', 'auto');
    setAttr(el, 'allowsEdgeAntialiasing', '1');
    setAttr(el, 'allowsGroupOpacity', '1');
    setAttr(el, 'contentsFormat', 'AutomaticAppKit');
    setAttr(el, 'cornerCurve', 'circular');
    const font = doc.createElementNS(CAML_NS, 'font');
    font.setAttribute('type', 'string');
    font.setAttribute('value', (layer as TextLayer).fontFamily || 'SFProText-Regular');
    el.appendChild(font);
    const str = doc.createElementNS(CAML_NS, 'string');
    str.setAttribute('type', 'string');
    str.setAttribute('value', (layer as TextLayer).text || '');
    el.appendChild(str);
  }
  if (layer.type === 'emitter') {
    const emitterLayer = layer as EmitterLayer;
    el.setAttribute('emitterPosition', `${emitterLayer.emitterPosition?.x || 0} ${emitterLayer.emitterPosition?.y || 0}`);
    el.setAttribute('emitterSize', `${emitterLayer.emitterSize?.w || 0} ${emitterLayer.emitterSize?.h || 0}`);
    el.setAttribute('emitterShape', emitterLayer.emitterShape || 'point');
    el.setAttribute('emitterMode', emitterLayer.emitterMode || 'volume');
    el.setAttribute('renderMode', emitterLayer.renderMode || 'unordered');
    el.setAttribute('birthRate', '1');
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const num = (v: number) => String(Number(v));
    const emitterCells = doc.createElementNS(CAML_NS, 'emitterCells');
    emitterLayer.emitterCells?.forEach((cell, index) => {
      const emitterCell = doc.createElementNS(CAML_NS, 'CAEmitterCell');
      const contents = doc.createElementNS(CAML_NS, 'contents');
      const cg = doc.createElementNS(CAML_NS, 'CGImage');
      setAttr(cg, 'src', cell.src);
      contents.appendChild(cg);
      emitterCell.appendChild(contents);
      emitterCell.setAttribute('id', cell.id);
      emitterCell.setAttribute('name', `Cell ${index + 1}`);
      emitterCell.setAttribute('birthRate', num(cell.birthRate));
      emitterCell.setAttribute('lifetime', num(cell.lifetime));
      emitterCell.setAttribute('velocity', num(cell.velocity));
      emitterCell.setAttribute('emissionRange', num(rad(cell.emissionRange)));
      emitterCell.setAttribute('emissionLongitude', num(rad(cell.emissionLongitude)));
      emitterCell.setAttribute('emissionLatitude', num(rad(cell.emissionLatitude)));
      emitterCell.setAttribute('scale', num(cell.scale));
      emitterCell.setAttribute('scaleRange', num(cell.scaleRange));
      emitterCell.setAttribute('scaleSpeed', num(cell.scaleSpeed));
      emitterCell.setAttribute('alphaRange', num(cell.alphaRange));
      emitterCell.setAttribute('alphaSpeed', num(cell.alphaSpeed));
      emitterCell.setAttribute('spin', num(rad(cell.spin)));
      emitterCell.setAttribute('spinRange', num(rad(cell.spinRange)));
      emitterCell.setAttribute('xAcceleration', num(cell.xAcceleration));
      emitterCell.setAttribute('yAcceleration', num(cell.yAcceleration));
      emitterCells.appendChild(emitterCell);
    });
    el.appendChild(emitterCells);
  }

  if (layer.type === 'gradient') {
    const gradLayer = layer as any;
    const startX = gradLayer.startPoint?.x ?? 0;
    const startY = gradLayer.startPoint?.y ?? 0;
    const endX = gradLayer.endPoint?.x ?? 1;
    const endY = gradLayer.endPoint?.y ?? 1;
    
    setAttr(el, 'startPoint', `${startX} ${startY}`);
    setAttr(el, 'endPoint', `${endX} ${endY}`);
    
    if (gradLayer.colors && gradLayer.colors.length > 0) {
      const colorsEl = doc.createElementNS(CAML_NS, 'colors');
      for (const gradColor of gradLayer.colors) {
        const cgColor = doc.createElementNS(CAML_NS, 'CGColor');
        const colorValue = hexToForegroundColor(gradColor.color);
        if (colorValue) {
          cgColor.setAttribute('value', colorValue);
        }
        if (gradColor.opacity < 1) {
          const op = Math.round(gradColor.opacity * 100) / 100;
          cgColor.setAttribute('opacity', String(op));
        }
        colorsEl.appendChild(cgColor);
      }
      el.appendChild(colorsEl);
    }
    
    const typeEl = doc.createElementNS(CAML_NS, 'type');
    typeEl.setAttribute('value', gradLayer.gradientType || 'axial');
    el.appendChild(typeEl);
  }

  if (layer.type === 'replicator') {
    const replicatorLayer = layer as ReplicatorLayer;
    
    // instanceColor must be set to white (1 1 1) for sublayer colors to show through
    setAttr(el, 'instanceColor', '1 1 1');
    
    // Set instance count (default 1)
    setAttr(el, 'instanceCount', replicatorLayer.instanceCount ?? 1);
    
    // Set instance delay (default 0)
    if (typeof replicatorLayer.instanceDelay === 'number') {
      setAttr(el, 'instanceDelay', replicatorLayer.instanceDelay);
    }
    
    // Build instanceTransform string
    const parts: string[] = [];
    const trans = replicatorLayer.instanceTranslation;
    if (trans && (trans.x !== 0 || trans.y !== 0 || trans.z !== 0)) {
      parts.push(`translate(${trans.x}, ${trans.y}, ${trans.z})`);
    }
    
    const rot = replicatorLayer.instanceRotation;
    if (typeof rot === 'number' && rot !== 0) {
      parts.push(`rotate(${rot}deg)`);
    }
    
    if (parts.length > 0) {
      setAttr(el, 'instanceTransform', parts.join(' '));
    }
  }
  if (wallpaperParallaxGroupsInput) {
    const style = doc.createElementNS(CAML_NS, 'style');
    
    const wallpaperBackgroundAssetNames = doc.createElementNS(CAML_NS, 'wallpaperBackgroundAssetNames');
    wallpaperBackgroundAssetNames.setAttribute('type', 'NSArray');
    style.appendChild(wallpaperBackgroundAssetNames);
    
    const wallpaperFloatingAssetNames = doc.createElementNS(CAML_NS, 'wallpaperFloatingAssetNames');
    wallpaperFloatingAssetNames.setAttribute('type', 'NSArray');
    style.appendChild(wallpaperFloatingAssetNames);
    
    const wallpaperParallaxGroups = doc.createElementNS(CAML_NS, 'wallpaperParallaxGroups');
    wallpaperParallaxGroups.setAttribute('type', 'NSArray');
    for (const dict of wallpaperParallaxGroupsInput) {
      const nsDict = doc.createElementNS(CAML_NS, 'NSDictionary');
      
      const axis = doc.createElementNS(CAML_NS, 'axis');
      axis.setAttribute('type', 'string');
      axis.setAttribute('value', dict.axis);
      nsDict.appendChild(axis);
      
      const image = doc.createElementNS(CAML_NS, 'image');
      image.setAttribute('type', 'string');
      image.setAttribute('value', dict.image);
      nsDict.appendChild(image);
      
      const keyPath = doc.createElementNS(CAML_NS, 'keyPath');
      keyPath.setAttribute('type', 'string');
      keyPath.setAttribute('value', dict.keyPath);
      nsDict.appendChild(keyPath);
      
      const layerName = doc.createElementNS(CAML_NS, 'layerName');
      layerName.setAttribute('type', 'string');
      layerName.setAttribute('value', dict.layerName);
      nsDict.appendChild(layerName);
      
      const mapMaxTo = doc.createElementNS(CAML_NS, 'mapMaxTo');
      mapMaxTo.setAttribute('type', 'integer');
      mapMaxTo.setAttribute('value', String(dict.mapMaxTo));
      nsDict.appendChild(mapMaxTo);
      
      const mapMinTo = doc.createElementNS(CAML_NS, 'mapMinTo');
      mapMinTo.setAttribute('type', 'integer');
      mapMinTo.setAttribute('value', String(dict.mapMinTo));
      nsDict.appendChild(mapMinTo);
      
      const title = doc.createElementNS(CAML_NS, 'title');
      title.setAttribute('type', 'string');
      title.setAttribute('value', dict.title);
      nsDict.appendChild(title);
      
      const view = doc.createElementNS(CAML_NS, 'view');
      view.setAttribute('type', 'string');
      view.setAttribute('value', dict.view);
      nsDict.appendChild(view);
      
      wallpaperParallaxGroups.appendChild(nsDict);
    }
    
    style.appendChild(wallpaperParallaxGroups);
    
    const wallpaperPropertyGroups = doc.createElementNS(CAML_NS, 'wallpaperPropertyGroups');
    wallpaperPropertyGroups.setAttribute('type', 'NSArray');
    
    for (const dict of stateOverridesInput?.Locked ?? []) {
      const currentLayer = findById(layer.children || [], dict.targetId);
      if (!currentLayer) continue;
      console.log(dict);
      const nsDict = doc.createElementNS(CAML_NS, 'NSDictionary');
      const image = doc.createElementNS(CAML_NS, 'image');
      image.setAttribute('type', 'null');
      nsDict.appendChild(image);
      const keyPath = doc.createElementNS(CAML_NS, 'keyPath');
      keyPath.setAttribute('type', 'string');
      keyPath.setAttribute('value', dict.keyPath);
      nsDict.appendChild(keyPath);
      const layerName = doc.createElementNS(CAML_NS, 'layerName');
      layerName.setAttribute('type', 'string');
      layerName.setAttribute('value', currentLayer.name);
      nsDict.appendChild(layerName);
      
      const HomeValue = stateOverridesInput?.Unlock.find((d) => d.keyPath === dict.keyPath && d.targetId === dict.targetId)?.value;
      const SleepValue = stateOverridesInput?.Sleep.find((d) => d.keyPath === dict.keyPath && d.targetId === dict.targetId)?.value;
      const v_home = doc.createElementNS(CAML_NS, 'v_home');
      v_home.setAttribute('type', 'integer');
      v_home.setAttribute('value', String(HomeValue));
      nsDict.appendChild(v_home);
      const v_lock = doc.createElementNS(CAML_NS, 'v_lock');
      v_lock.setAttribute('type', 'integer');
      v_lock.setAttribute('value', String(dict.value));
      nsDict.appendChild(v_lock);
      const v_sleep = doc.createElementNS(CAML_NS, 'v_sleep');
      v_sleep.setAttribute('type', 'integer');
      v_sleep.setAttribute('value', String(SleepValue));
      nsDict.appendChild(v_sleep);
      const view = doc.createElementNS(CAML_NS, 'view');
      view.setAttribute('type', 'string');
      view.setAttribute('value', 'Floating');
      nsDict.appendChild(view);
      wallpaperPropertyGroups.appendChild(nsDict);
    }
    style.appendChild(wallpaperPropertyGroups);
    
    el.appendChild(style);
  }

  if (layer.children && layer.children.length > 0) {
    const sublayersEl = doc.createElementNS(CAML_NS, 'sublayers');
    layer.children.forEach((child) => {
      const childEl = serializeLayer(doc, child, project);
      sublayersEl.appendChild(childEl);
    });
    el.appendChild(sublayersEl);
  }
  
  const anim = (layer as any).animations as
    | Animations
    | undefined;
  if (anim?.enabled && Array.isArray(anim.values) && anim.values.length > 0) {
    const keyPath = (anim.keyPath ?? 'position') as KeyPath;
    const animationsEl = doc.createElementNS(CAML_NS, 'animations');
    const a = doc.createElementNS(CAML_NS, 'animation');
    a.setAttribute('type', 'CAKeyframeAnimation');
    a.setAttribute('keyPath', keyPath);
    a.setAttribute('autoreverses', String((anim.autoreverses ?? 0) as number));
    a.setAttribute('beginTime', '1e-100');
    const providedDur = Number((anim as any).durationSeconds);
    const duration = Number.isFinite(providedDur) && providedDur > 0
      ? providedDur
      : Math.max(1, (anim.values?.length || 1) - 1);
    a.setAttribute('duration', String(duration));
    a.setAttribute('speed', String(anim.speed || 1));
    a.setAttribute('removedOnCompletion', '0');
    const infinite = Number((anim as any).infinite ?? 1) === 1;
    const providedRepeat = Number((anim as any).repeatDurationSeconds);
    const repeatDuration = Number.isFinite(providedRepeat) && providedRepeat > 0 ? providedRepeat : duration;
    if (infinite) {
      a.setAttribute('repeatCount', 'inf');
      a.setAttribute('repeatDuration', 'inf');
    } else {
      a.setAttribute('repeatDuration', String(repeatDuration));
    }
    a.setAttribute('calculationMode', 'linear');
    const valuesEl = doc.createElementNS(CAML_NS, 'values');
    if (keyPath === 'position') {
      for (const ptRaw of anim.values as Array<any>) {
        const pt = ptRaw || {};
        const p = doc.createElementNS(CAML_NS, 'CGPoint');
        const cx = Math.round(Number(pt?.x ?? 0));
        const cy = Math.round(Number(pt?.y ?? 0));
        p.setAttribute('value', `${cx} ${cy}`);
        valuesEl.appendChild(p);
      }
    } else if (keyPath === 'position.x') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const cx = Math.round(Number.isFinite(n) ? n : 0);
        const intEl = doc.createElementNS(CAML_NS, 'integer');
        intEl.setAttribute('value', String(cx));
        valuesEl.appendChild(intEl);
      }
    } else if (keyPath === 'position.y') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const cy = Math.round(Number.isFinite(n) ? n : 0);
        const intEl = doc.createElementNS(CAML_NS, 'integer');
        intEl.setAttribute('value', String(cy));
        valuesEl.appendChild(intEl);
      }
    } else if (keyPath === 'transform.rotation.x' || keyPath === 'transform.rotation.y' || keyPath === 'transform.rotation.z') {
      for (const v of anim.values as Array<any>) {
        const deg = Number(v);
        const rad = (Number.isFinite(deg) ? deg : 0) * Math.PI / 180;
        const realEl = doc.createElementNS(CAML_NS, 'real');
        realEl.setAttribute('value', String(rad));
        valuesEl.appendChild(realEl);
      }
    } else if (keyPath === 'opacity') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const op = Number.isFinite(n) ? n : 1;
        const realEl = doc.createElementNS(CAML_NS, 'real');
        realEl.setAttribute('value', String(op));
        valuesEl.appendChild(realEl);
      }
    } else if (keyPath === 'bounds') {
      for (const ptRaw of anim.values as Array<any>) {
        const pt = ptRaw || {};
        const p = doc.createElementNS(CAML_NS, 'CGRect');
        const w = Math.round(Number(pt?.w ?? 0));
        const h = Math.round(Number(pt?.h ?? 0));
        p.setAttribute('value', `0 0 ${w} ${h}`);
        valuesEl.appendChild(p);
      }
    }
    a.appendChild(valuesEl);
    animationsEl.appendChild(a);
    el.appendChild(animationsEl);
  }

  return el;
}

function parseCALayerAnimations(el: Element): Animations | undefined {
  // Parse per-layer keyframe animations
  let parsedAnimations: Animations | undefined;
  try {
    const animationsEl = directChildByTagNS(el, 'animations');
    const animNode = animationsEl?.getElementsByTagNameNS(CAML_NS, 'animation')[0];
    if (animNode) {
      const kp = (animNode.getAttribute('keyPath') || 'position') as KeyPath;
      const valuesNode = animNode.getElementsByTagNameNS(CAML_NS, 'values')[0];
      const vals: Array<{ x: number; y: number } | { w: number; h: number } | number> = [];
      if (valuesNode) {
        if (kp === 'position') {
          const pts = Array.from(valuesNode.getElementsByTagNameNS(CAML_NS, 'CGPoint'));
          for (const p of pts) {
            const v = p.getAttribute('value') || '';
            const parts = v.split(/[\s]+/).map((s) => Number(s));
            const x = Math.round(Number.isFinite(parts[0]) ? parts[0] : 0);
            const y = Math.round(Number.isFinite(parts[1]) ? parts[1] : 0);
            vals.push({ x, y });
          }
        } else if (kp === 'position.x' || kp === 'position.y') {
          const values = Array.from(valuesNode.children);
          for (const n of values) {
            const v = Number(n.getAttribute('value') || '');
            vals.push(Math.round(Number.isFinite(v) ? v : 0));
          }
        } else if (kp === 'transform.rotation.x' || kp === 'transform.rotation.y' || kp === 'transform.rotation.z') {
          const values = Array.from(valuesNode.children);
          for (const r of values) {
            const rad = Number(r.getAttribute('value') || '');
            const deg = ((Number.isFinite(rad) ? rad : 0) * 180) / Math.PI;
            vals.push(deg);
          }
        } else if (kp === 'opacity') {
          const reals = Array.from(valuesNode.getElementsByTagNameNS(CAML_NS, 'real'));
          for (const n of reals) {
            const v = Number(n.getAttribute('value') || '');
            vals.push(Number.isFinite(v) ? v : 1);
          }
        } else if (kp === 'bounds') {
          const rects = Array.from(valuesNode.getElementsByTagNameNS(CAML_NS, 'CGRect'));
          for (const r of rects) {
            const v = r.getAttribute('value') || '';
            const parts = v.split(/[,\s]+/).map((s) => Number(s));
            const w = Math.round(Number.isFinite(parts[2]) ? parts[2] : 0);
            const h = Math.round(Number.isFinite(parts[3]) ? parts[3] : 0);
            vals.push({ w, h });
          }
        }
      }
      const enabled = vals.length > 0;
      const autorevAttr = animNode.getAttribute('autoreverses');
      const autoreverses: 0 | 1 = (Number(autorevAttr) || 0) ? 1 : 0;
      const durAttr = animNode.getAttribute('duration');
      const durationSeconds = Number(durAttr);
      const speed = animNode.getAttribute('speed');
      const repCount = animNode.getAttribute('repeatCount');
      const repDurAttr = animNode.getAttribute('repeatDuration');
      const infinite: 0 | 1 = (repCount === 'inf' || repDurAttr === 'inf') ? 1 : 0;
      const repeatDurationSeconds = !infinite && Number.isFinite(Number(repDurAttr || '')) ? Number(repDurAttr) : undefined;
      parsedAnimations = {
        enabled,
        keyPath: kp,
        autoreverses,
        values: vals,
        durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : undefined,
        infinite,
        repeatDurationSeconds: repeatDurationSeconds,
        speed: Number.isFinite(Number(speed)) ? Number(speed) : undefined,
      };
    }
  } catch {} 
  return parsedAnimations;
}
