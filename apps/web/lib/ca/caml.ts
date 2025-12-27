import { CAEmitterCell } from '@/components/editor/emitter/emitter';
import { AnyLayer, TextLayer, VideoLayer, CAStateOverrides, CAStateTransitions, GyroParallaxDictionary, KeyPath, Animations, EmitterLayer, LayerBase, ReplicatorLayer, LiquidGlassLayer } from './types';
import { blendModes } from '../blending';
import { Filter, SupportedFilterTypes } from '../filters';
import { CAML_NS } from './serialize/serializeCAML';
import { radToDeg } from '../utils';

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
        let lockedValue = directChildByTagNS(dict, 'v_lock')?.getAttribute('value') || '';
        let homeValue = directChildByTagNS(dict, 'v_home')?.getAttribute('value') || '';
        let sleepValue = directChildByTagNS(dict, 'v_sleep')?.getAttribute('value') || '';
        const isRotation = keyPath === 'transform.rotation.z' || keyPath === 'transform.rotation.x' || keyPath === 'transform.rotation.y';
        
        if (isRotation) {
          homeValue = radToDeg(Number(homeValue)).toFixed(5);
          sleepValue = radToDeg(Number(sleepValue)).toFixed(5);
          lockedValue = radToDeg(Number(lockedValue)).toFixed(5);
        }
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
  } catch { }

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
  const parsedAnimations = parseCALayerAnimations(el);

  return {
    ...base,
    type: 'transform',
    children,
    ...(parsedAnimations ? { animations: parsedAnimations } : {} as any),
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

function parseCALiquidGlassLayer(el: Element): AnyLayer {
  const base = parseLayerBase(el);
  const children = parseSublayers(el);
  const parsedAnimations = parseCALayerAnimations(el);
  return {
    ...base,
    type: 'liquidGlass',
    children,
    ...(parsedAnimations ? { animations: parsedAnimations } : {} as any),
  } as LiquidGlassLayer;
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
      else if (n.localName === 'CABackdropLayer' && attr(n, 'caplayKind') === 'liquidGlass') children.push(parseCALiquidGlassLayer(n));
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

function parseCALayerAnimations(el: Element): Animations | undefined {
  // Parse per-layer keyframe animations
  let parsedAnimations: Animations = [];
  try {
    const animationsEl = directChildByTagNS(el, 'animations');
    const animFirst = animationsEl?.getElementsByTagNameNS(CAML_NS, 'animation') || [];
    const animNodes = animationsEl?.getElementsByTagNameNS(CAML_NS, 'p') || [];
    for (const animNode of [...animFirst, ...animNodes]) {
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
      parsedAnimations.push({
        enabled,
        keyPath: kp,
        autoreverses,
        values: vals,
        durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : undefined,
        infinite,
        repeatDurationSeconds: repeatDurationSeconds,
        speed: Number.isFinite(Number(speed)) ? Number(speed) : undefined,
      });
    }
  } catch { }
  return parsedAnimations;
}
