import { AnyLayer, CAProject, GroupLayer, TextLayer, VideoLayer, CAStateOverrides, CAStateTransitions, GyroParallaxDictionary } from './types';

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
    for (const dict of dicts) {
      const axis = dict.getElementsByTagNameNS(CAML_NS, 'axis')[0]?.getAttribute('value') || 'x';
      const image = dict.getElementsByTagNameNS(CAML_NS, 'image')[0]?.getAttribute('value') || 'null';
      const keyPath = dict.getElementsByTagNameNS(CAML_NS, 'keyPath')[0]?.getAttribute('value') || 'position.x';
      const layerName = dict.getElementsByTagNameNS(CAML_NS, 'layerName')[0]?.getAttribute('value') || '';
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
  }
  return result;
}

export function parseStateOverrides(xml: string): CAStateOverrides {
  const result: CAStateOverrides = {};
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return result;
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
              val = (val * 180) / Math.PI;
            }
          }
          if (targetId && keyPath) arr.push({ targetId, keyPath, value: val });
        }
      }
      result[name] = arr;
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
  const root = caml.getElementsByTagNameNS(CAML_NS, 'CALayer')[0];
  if (!root) return null;
  return parseCALayer(root);
}

export function parseStates(xml: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return [];
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

function parseCAVideoLayer(el: Element): VideoLayer {
  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Video Layer';
  const bounds = parseNumberList(attr(el, 'bounds'));
  const position = parseNumberList(attr(el, 'position'));
  const anchorPt = parseNumberList(attr(el, 'anchorPoint'));
  const geometryFlippedAttr = attr(el, 'geometryFlipped');
  const rotationZ = attr(el, 'transform.rotation.z');
  const rotationX = attr(el, 'transform.rotation.x');
  const rotationY = attr(el, 'transform.rotation.y');
  const opacity = attr(el, 'opacity') ? Number(attr(el, 'opacity')) : undefined;

  const base = {
    id,
    name,
    position: { x: position[0] ?? 0, y: position[1] ?? 0 },
    size: { w: bounds[2] ?? 0, h: bounds[3] ?? 0 },
    opacity,
    rotation: rotationZ ? ((Number(rotationZ) * 180) / Math.PI) : undefined,
    rotationX: rotationX ? ((Number(rotationX) * 180) / Math.PI) : undefined,
    rotationY: rotationY ? ((Number(rotationY) * 180) / Math.PI) : undefined,
    anchorPoint: (anchorPt.length === 2 && (anchorPt[0] !== 0.5 || anchorPt[1] !== 0.5)) ? { x: anchorPt[0], y: anchorPt[1] } : undefined,
    geometryFlipped: typeof geometryFlippedAttr !== 'undefined' ? ((geometryFlippedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
  };

  const frameCountAttr = attr(el, 'caplayFrameCount') || attr(el, 'caplay.frameCount');
  const fpsAttr = attr(el, 'caplayFPS') || attr(el, 'caplay.fps');
  const durationAttr = attr(el, 'caplayDuration') || attr(el, 'caplay.duration');
  const autoReversesAttr = attr(el, 'caplayAutoReverses') || attr(el, 'caplay.autoReverses');
  const prefixAttr = attr(el, 'caplayFramePrefix') || attr(el, 'caplay.framePrefix');
  const extAttr = attr(el, 'caplayFrameExtension') || attr(el, 'caplay.frameExtension');

  let frameCount = frameCountAttr ? Number(frameCountAttr) : undefined;
  let fps = fpsAttr ? Number(fpsAttr) : undefined;
  let duration = durationAttr ? Number(durationAttr) : undefined;
  const autoReverses = autoReversesAttr === '1' || autoReversesAttr === 'true';

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
  };

  return layer;
}

function parseCATextLayer(el: Element): AnyLayer {
  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Text Layer';
  const bounds = parseNumberList(attr(el, 'bounds'));
  const position = parseNumberList(attr(el, 'position'));
  const anchorPt = parseNumberList(attr(el, 'anchorPoint'));
  const geometryFlippedAttr = attr(el, 'geometryFlipped');
  const rotationZ = attr(el, 'transform.rotation.z');
  const rotationX = attr(el, 'transform.rotation.x');
  const rotationY = attr(el, 'transform.rotation.y');
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

  const base = {
    id,
    name,
    position: { x: position[0] ?? 0, y: position[1] ?? 0 },
    size: { w: bounds[2] ?? 0, h: bounds[3] ?? 0 },
    rotation: rotationZ ? ((Number(rotationZ) * 180) / Math.PI) : undefined,
    rotationX: rotationX ? ((Number(rotationX) * 180) / Math.PI) : undefined,
    rotationY: rotationY ? ((Number(rotationY) * 180) / Math.PI) : undefined,
    anchorPoint: (anchorPt.length === 2 && (anchorPt[0] !== 0.5 || anchorPt[1] !== 0.5)) ? { x: anchorPt[0], y: anchorPt[1] } : undefined,
    geometryFlipped: typeof geometryFlippedAttr !== 'undefined' ? ((geometryFlippedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
  } as const;

  const layer: AnyLayer = {
    ...base,
    type: 'text',
    text: textValue || '',
    fontFamily,
    fontSize: fontSizeAttr ? Number(fontSizeAttr) : undefined,
    color: colorHex,
    align: alignmentMode,
    wrapped: typeof wrappedAttr !== 'undefined' ? ((wrappedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
  } as AnyLayer;
  return layer;
}

function parseCALayer(el: Element): AnyLayer {
  const caplayKind = attr(el, 'caplayKind') || attr(el, 'caplay.kind');
  if (caplayKind === 'video') {
    return parseCAVideoLayer(el);
  }

  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Layer';
  const bounds = parseNumberList(attr(el, 'bounds')); // x y w h
  const position = parseNumberList(attr(el, 'position')); // x y
  const anchorPt = parseNumberList(attr(el, 'anchorPoint')); // ax ay in 0..1
  const geometryFlippedAttr = attr(el, 'geometryFlipped');
  const rotZAttr = attr(el, 'transform.rotation.z');
  const rotXAttr = attr(el, 'transform.rotation.x');
  const rotYAttr = attr(el, 'transform.rotation.y');
  const opacity = attr(el, 'opacity') ? Number(attr(el, 'opacity')) : undefined;
  const transformAttr = attr(el, 'transform');
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
  const cornerRadius = attr(el, 'cornerRadius') ? Number(attr(el, 'cornerRadius')) : undefined;
  const borderColorRaw = attr(el, 'borderColor');
  const borderColor = floatsToHexColor(borderColorRaw) || borderColorRaw || undefined;
  const borderWidth = attr(el, 'borderWidth') ? Number(attr(el, 'borderWidth')) : undefined;
  const textValue = attr(el, 'text');
  const fontFamily = attr(el, 'fontFamily');
  const fontSizeAttr = attr(el, 'fontSize');
  const fontSize = fontSizeAttr ? Number(fontSizeAttr) : undefined;
  const color = attr(el, 'color');
  const align = attr(el, 'align') as TextLayer['align'] | undefined;

  let imageSrc: string | undefined;
  const contents = el.getElementsByTagNameNS(CAML_NS, 'contents')[0]; // was supposed to be contents :P thats why images wouldn't render in mica
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

  let tRotZ: number | undefined;
  let tRotX: number | undefined;
  let tRotY: number | undefined;
  if (transformAttr && /rotate\(/i.test(transformAttr)) {
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
            tRotX = deg;
          } else if (Math.abs(ay - 1) < 1e-6 && Math.abs(ax) < 1e-6 && Math.abs(az) < 1e-6) {
            tRotY = deg;
          } else if (Math.abs(az - 1) < 1e-6 && Math.abs(ax) < 1e-6 && Math.abs(ay) < 1e-6) {
            tRotZ = deg;
          }
        } else {
          tRotZ = deg;
        }
      }
    } catch {}
  }

  const base = {
    id,
    name,
    position: { x: position[0] ?? 0, y: position[1] ?? 0 },
    size: { w: bounds[2] ?? 0, h: bounds[3] ?? 0 },
    opacity,
    backgroundColor,
    backgroundOpacity,
    cornerRadius,
    borderColor,
    borderWidth,
    rotation: (rotZAttr ? ((Number(rotZAttr) * 180) / Math.PI) : undefined) ?? tRotZ,
    rotationX: (rotXAttr ? ((Number(rotXAttr) * 180) / Math.PI) : undefined) ?? tRotX,
    rotationY: (rotYAttr ? ((Number(rotYAttr) * 180) / Math.PI) : undefined) ?? tRotY,
    anchorPoint: (anchorPt.length === 2 && (anchorPt[0] !== 0.5 || anchorPt[1] !== 0.5)) ? { x: anchorPt[0], y: anchorPt[1] } : undefined,
    geometryFlipped: typeof geometryFlippedAttr !== 'undefined' ? ((geometryFlippedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
  } as const;

  // Parse per-layer keyframe animations
  let parsedAnimations: {
    enabled?: boolean;
    keyPath?: 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
    autoreverses?: 0 | 1;
    values?: Array<{ x: number; y: number } | number>;
    durationSeconds?: number;
    infinite?: 0 | 1;
    repeatDurationSeconds?: number;
  } | undefined;
  try {
    const animationsEl = el.getElementsByTagNameNS(CAML_NS, 'animations')[0];
    const animNode = animationsEl?.getElementsByTagNameNS(CAML_NS, 'animation')[0];
    if (animNode) {
      const kp = (animNode.getAttribute('keyPath') || 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
      const valuesNode = animNode.getElementsByTagNameNS(CAML_NS, 'values')[0];
      const vals: Array<{ x: number; y: number } | number> = [];
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
        } else if (kp === 'position.x') {
          const nums = Array.from(valuesNode.getElementsByTagNameNS(CAML_NS, 'NSNumber'));
          for (const n of nums) {
            const v = Number(n.getAttribute('value') || '');
            vals.push(Math.round(Number.isFinite(v) ? v : 0));
          }
        } else if (kp === 'position.y') {
          const nums = Array.from(valuesNode.getElementsByTagNameNS(CAML_NS, 'NSNumber'));
          for (const n of nums) {
            const v = Number(n.getAttribute('value') || '');
            vals.push(Math.round(Number.isFinite(v) ? v : 0));
          }
        } else if (kp === 'transform.rotation.x' || kp === 'transform.rotation.y' || kp === 'transform.rotation.z') {
          const reals = Array.from(valuesNode.getElementsByTagNameNS(CAML_NS, 'real'));
          for (const r of reals) {
            const rad = Number(r.getAttribute('value') || '');
            const deg = ((Number.isFinite(rad) ? rad : 0) * 180) / Math.PI;
            vals.push(deg);
          }
        }
      }
      const enabled = vals.length > 0;
      const autorevAttr = animNode.getAttribute('autoreverses');
      const autoreverses: 0 | 1 = (Number(autorevAttr) || 0) ? 1 : 0;
      const durAttr = animNode.getAttribute('duration');
      const durationSeconds = Number(durAttr);
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
      };
    }
  } catch {}

  const sublayersEl = directChildByTagNS(el, 'sublayers');
  const sublayerNodesRaw = sublayersEl ? directChildrenByTagNS(sublayersEl, 'CALayer').concat(directChildrenByTagNS(sublayersEl, 'CATextLayer')) : [];
  const sublayerNodes = sublayerNodesRaw;

  if (imageSrc && sublayerNodes.length === 0) {
    return {
      ...base,
      type: 'image',
      src: imageSrc,
      ...(parsedAnimations ? { animations: parsedAnimations } : {}),
    } as AnyLayer;
  }

  if (textValue !== undefined && sublayerNodes.length === 0) {
    return {
      ...base,
      type: 'text',
      text: textValue || '',
      fontFamily: fontFamily || undefined,
      fontSize,
      color: color || undefined,
      align: align || undefined,
      ...(parsedAnimations ? { animations: parsedAnimations } : {}),
    } as AnyLayer;
  }

  if (sublayersEl) {
    const children: AnyLayer[] = [];
    const kids = sublayerNodes;
    for (const n of kids) {
      if (n.localName === 'CALayer') children.push(parseCALayer(n));
      else if (n.localName === 'CATextLayer') children.push(parseCATextLayer(n));
    }
    const normalize = (s: string) => {
      try { s = decodeURIComponent(s); } catch {}
      return (s || '').trim().toLowerCase();
    };
    const imageSrcNorm = imageSrc ? normalize(imageSrc) : '';
    const imageFileNorm = imageSrc ? normalize((imageSrc.split('/').pop() || imageSrc)) : '';
    const hasEquivalentChild = children.some((ch) => {
      if ((ch as any).type !== 'image') return false;
      const cs = (ch as any).src || '';
      const csNorm = normalize(cs);
      const cfNorm = normalize((cs.split('/').pop() || cs));
      return !!imageSrc && (csNorm === imageSrcNorm || cfNorm === imageFileNorm);
    });

    if (imageSrc && !isTopLevelRoot(el) && !hasEquivalentChild) {
      const imgChild: AnyLayer = {
        ...base,
        id: crypto.randomUUID(),
        name: (base as any).name ? `${(base as any).name} (Contents)` : 'Contents Image',
        type: 'image',
        position: { x: (base as any).size.w / 2, y: (base as any).size.h / 2 },
        size: { w: (base as any).size.w, h: (base as any).size.h },
        src: imageSrc,
        anchorPoint: { x: 0.5, y: 0.5 },
      } as AnyLayer;
      children.unshift(imgChild);
    }
    if (children.length > 0) {
      const group: GroupLayer = {
        ...base,
        type: 'group',
        children,
        ...(parsedAnimations ? { animations: parsedAnimations } : {} as any),
      };
      return group;
    }
  }

  if (sublayerNodes.length === 0) {
    return {
      ...base,
      type: 'shape',
      shape: 'rect',
      fill: (base as any).backgroundColor,
      radius: (base as any).cornerRadius,
      borderColor: (base as any).borderColor,
      borderWidth: (base as any).borderWidth,
      ...(parsedAnimations ? { animations: parsedAnimations } : {}),
    } as AnyLayer;
  }
  // Fallback
  const children = sublayerNodes.map((n) => parseCALayer(n));
  const group: GroupLayer = { ...base, type: 'group', children, ...(parsedAnimations ? { animations: parsedAnimations } : {} as any) };
  return group;
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
  const rootEl = serializeLayer(doc, root, project, wallpaperParallaxGroupsInput);
  
  const scriptComponents = doc.createElementNS(CAML_NS, 'scriptComponents');
  const statesEl = doc.createElementNS(CAML_NS, 'states');
  const layerIndex: Record<string, AnyLayer> = {};
  const indexWalk = (l: AnyLayer) => {
    layerIndex[l.id] = l as AnyLayer;
    if ((l as any).type === 'group' && Array.isArray((l as any).children)) {
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
        case "opacity":
          defaultVal = layerIndex[override.targetId].opacity;
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

    const ovs = (stateOverridesInput || {})[stateName] || [];
    for (const ov of ovs) {
      const el = doc.createElementNS(CAML_NS, 'LKStateSetValue');
      el.setAttribute('targetId', ov.targetId);
      el.setAttribute('keyPath', ov.keyPath);
      const vEl = doc.createElementNS(CAML_NS, 'value');
      if (typeof ov.value === 'number') {
        let outVal = ov.value;
        if (ov.keyPath === 'transform.rotation.z') {
          outVal = (ov.value as number) * Math.PI / 180;
        }
        const isInt = Number.isInteger(outVal);
        vEl.setAttribute("type", isInt ? "integer" : "real");
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
      el.setAttribute('keyPath', elSpec.keyPath);
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
  rootEl.appendChild(statesEl);
  rootEl.appendChild(stateTransitions);
  caml.appendChild(rootEl);

  const xml = new XMLSerializer().serializeToString(doc);
  const formatted = formatXML(xml);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + formatted;
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

function serializeLayer(doc: XMLDocument, layer: AnyLayer, project?: CAProject, wallpaperParallaxGroupsInput?: GyroParallaxDictionary[]): Element {
  const isText = layer.type === 'text';
  const el = doc.createElementNS(CAML_NS, isText ? 'CATextLayer' : 'CALayer');
  setAttr(el, 'id', layer.id);
  setAttr(el, 'name', layer.name);
  setAttr(el, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  setAttr(el, 'position', `${Math.round(layer.position.x)} ${Math.round(layer.position.y)}`);
  const ax = (layer as any).anchorPoint?.x;
  const ay = (layer as any).anchorPoint?.y;
  if (typeof ax === 'number' && typeof ay === 'number') {
    if (!(Math.abs(ax - 0.5) < 1e-6 && Math.abs(ay - 0.5) < 1e-6)) {
      setAttr(el, 'anchorPoint', `${ax} ${ay}`);
    }
  }
  const gf = (layer as any).geometryFlipped;
  if (gf === 0 || gf === 1) setAttr(el, 'geometryFlipped', String(gf));
  setAttr(el, 'opacity', layer.opacity ?? undefined);
  const rotZ = (layer as any).rotation;
  const rotX = (layer as any).rotationX;
  const rotY = (layer as any).rotationY;
  if (typeof rotZ === 'number' && Number.isFinite(rotZ)) {
    setAttr(el, 'transform.rotation.z', (rotZ * Math.PI) / 180);
  }
  if (typeof rotX === 'number' && Number.isFinite(rotX)) {
    setAttr(el, 'transform.rotation.x', (rotX * Math.PI) / 180);
  }
  if (typeof rotY === 'number' && Number.isFinite(rotY)) {
    setAttr(el, 'transform.rotation.y', (rotY * Math.PI) / 180);
  }
  const parts: string[] = [];
  if (typeof rotZ === 'number' && Number.isFinite(rotZ)) parts.push(`rotate(${rotZ}deg)`);
  if (typeof rotY === 'number' && Number.isFinite(rotY)) parts.push(`rotate(${rotY}deg, 0, 1, 0)`);
  if (typeof rotX === 'number' && Number.isFinite(rotX)) parts.push(`rotate(${rotX}deg, 1, 0, 0)`);
  if (parts.length) setAttr(el, 'transform', parts.join(' '));
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
      a.setAttribute('calculationMode', 'linear');
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

  if (wallpaperParallaxGroupsInput && wallpaperParallaxGroupsInput.length > 0) {
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
    style.appendChild(wallpaperPropertyGroups);
    
    el.appendChild(style);
  }

  if (layer.type === 'group') {
    const sublayers = doc.createElementNS(CAML_NS, 'sublayers');
    const children = (layer as GroupLayer).children || [];
    for (const child of children) {
      sublayers.appendChild(serializeLayer(doc, child, project));
    }
    if (children.length) el.appendChild(sublayers);
  }

  const anim = (layer as any).animations as
    | { enabled?: boolean; keyPath?: 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z'; autoreverses?: 0 | 1; values?: Array<{ x: number; y: number } | number>; durationSeconds?: number }
    | undefined;
  if (anim?.enabled && Array.isArray(anim.values) && anim.values.length > 0) {
    const keyPath = (anim.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
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
        const numEl = doc.createElementNS(CAML_NS, 'NSNumber');
        numEl.setAttribute('value', String(cx));
        valuesEl.appendChild(numEl);
      }
    } else if (keyPath === 'position.y') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const cy = Math.round(Number.isFinite(n) ? n : 0);
        const numEl = doc.createElementNS(CAML_NS, 'NSNumber');
        numEl.setAttribute('value', String(cy));
        valuesEl.appendChild(numEl);
      }
    } else if (keyPath === 'transform.rotation.x' || keyPath === 'transform.rotation.y' || keyPath === 'transform.rotation.z') {
      for (const v of anim.values as Array<any>) {
        const deg = Number(v);
        const rad = (Number.isFinite(deg) ? deg : 0) * Math.PI / 180;
        const realEl = doc.createElementNS(CAML_NS, 'real');
        realEl.setAttribute('value', String(rad));
        valuesEl.appendChild(realEl);
      }
    }
    a.appendChild(valuesEl);
    animationsEl.appendChild(a);
    el.appendChild(animationsEl);
  }

  return el;
}
