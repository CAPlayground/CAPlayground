import { AnyLayer, CAProject, GroupLayer, TextLayer, CAStateOverrides, CAStateTransitions } from './types';

const CAML_NS = 'http://www.apple.com/CoreAnimation/1.0';

function attr(node: Element, name: string): string | undefined {
  const v = node.getAttribute(name);
  return v === null ? undefined : v;
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
            if (/^(integer|float|number)$/i.test(type)) {
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

function parseCALayer(el: Element): AnyLayer {
  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Layer';
  const bounds = parseNumberList(attr(el, 'bounds')); // x y w h
  const position = parseNumberList(attr(el, 'position')); // x y
  const opacity = attr(el, 'opacity') ? Number(attr(el, 'opacity')) : undefined;
  const backgroundColor = attr(el, 'backgroundColor');
  const cornerRadius = attr(el, 'cornerRadius') ? Number(attr(el, 'cornerRadius')) : undefined;
  const borderColor = attr(el, 'borderColor') || undefined;
  const borderWidth = attr(el, 'borderWidth') ? Number(attr(el, 'borderWidth')) : undefined;
  const textValue = attr(el, 'text');
  const fontFamily = attr(el, 'fontFamily');
  const fontSizeAttr = attr(el, 'fontSize');
  const fontSize = fontSizeAttr ? Number(fontSizeAttr) : undefined;
  const color = attr(el, 'color');
  const align = attr(el, 'align') as TextLayer['align'] | undefined;

  let imageSrc: string | undefined;
  const contents = el.getElementsByTagNameNS(CAML_NS, 'contents')[0]; //was supposed to be contents :P thats why images wouldn't render in mica 
  if (contents) {
    const images = contents.getElementsByTagNameNS(CAML_NS, 'CGImage');
    if (images && images[0]) {
      imageSrc = attr(images[0], 'src');
    }
  }

  const base = {
    id,
    name,
    position: { x: position[0] ?? 0, y: position[1] ?? 0 },
    size: { w: bounds[2] ?? 0, h: bounds[3] ?? 0 },
    opacity,
    backgroundColor,
    cornerRadius,
    borderColor,
    borderWidth,
  } as const;

  const sublayersEl = el.getElementsByTagNameNS(CAML_NS, 'sublayers')[0];
  const sublayerNodes = sublayersEl ? Array.from(sublayersEl.children).filter((n) => n.namespaceURI === CAML_NS && n.localName === 'CALayer') as Element[] : [];

  if (imageSrc && sublayerNodes.length === 0) {
    return {
      ...base,
      type: 'image',
      src: imageSrc,
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
    } as AnyLayer;
  }

  const children = sublayerNodes.map((n) => parseCALayer(n));
  const group: GroupLayer = {
    ...base,
    type: 'group',
    children,
  };
  return group;
}

export function serializeCAML(
  root: AnyLayer,
  project?: CAProject,
  stateNamesInput?: string[],
  stateOverridesInput?: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>,
  stateTransitionsInput?: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }>; }>
): string {
  const doc = document.implementation.createDocument(CAML_NS, 'caml', null);
  const caml = doc.documentElement;
  const rootEl = serializeLayer(doc, root, project);
  
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
          defaultVal = layerIndex[override.targetId].position.x;
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
        const target = layerIndex[ov.targetId];
        if (target && (ov.keyPath === 'position.x' || ov.keyPath === 'position.y')) {
          const docHeight = project?.height ?? 844;
          if (ov.keyPath === 'position.x') {
            outVal = Math.round((ov.value as number) + (target.size.w / 2));
          } else if (ov.keyPath === 'position.y') {
            outVal = Math.round(docHeight - ((ov.value as number) + (target.size.h / 2)));
          }
        } else if (ov.keyPath === 'transform.rotation.z') {
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
  rootEl.appendChild(scriptComponents);
  rootEl.appendChild(statesEl);
  rootEl.appendChild(stateTransitions);
  caml.appendChild(rootEl);

  const xml = new XMLSerializer().serializeToString(doc);
  return '<?xml version="1.0" encoding="UTF-8"?>' + xml; //added this or else mica couldnt open the caml
}

function setAttr(el: Element, name: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === '') return;
  el.setAttribute(name, String(value));
}

function serializeLayer(doc: XMLDocument, layer: AnyLayer, project?: CAProject): Element {
  const el = doc.createElementNS(CAML_NS, 'CALayer');
  setAttr(el, 'id', layer.id);
  setAttr(el, 'name', layer.name);
  setAttr(el, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  const docHeight = project?.height ?? 844;
  setAttr(el, 'position',
    `${Math.round(layer.position.x + layer.size.w / 2)} ${Math.round(docHeight - (layer.position.y + layer.size.h / 2))}` //maths 🤓 (x = x+layer_width/2, y = project_height-(y+layer_height/2))
  );
  setAttr(el, 'opacity', layer.opacity ?? undefined);
  if (layer.type === 'shape') {
    setAttr(el, 'backgroundColor', (layer as any).fill || '#ffffffff'); //fixed shape fill 🤯
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

  if (layer.type === 'text') {
    setAttr(el, 'text', layer.text);
    setAttr(el, 'fontFamily', layer.fontFamily);
    setAttr(el, 'fontSize', layer.fontSize ?? undefined);
    setAttr(el, 'color', layer.color);
    setAttr(el, 'align', layer.align);
  }

  if (layer.type === 'group') {
    const sublayers = doc.createElementNS(CAML_NS, 'sublayers');
    const children = (layer as GroupLayer).children || [];
    for (const child of children) {
      sublayers.appendChild(serializeLayer(doc, child, project));
    }
    if (children.length) el.appendChild(sublayers);
  }

  // Animations (position, position.x, position.y, transform.rotation.x, transform.rotation.y, transform.rotation.z)
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
    a.setAttribute('repeatCount', 'inf');
    a.setAttribute('repeatDuration', 'inf');
    a.setAttribute('calculationMode', 'linear');
    const valuesEl = doc.createElementNS(CAML_NS, 'values');
    const docHeight = project?.height ?? 844;
    if (keyPath === 'position') {
      for (const ptRaw of anim.values as Array<any>) {
        const pt = ptRaw || {};
        const p = doc.createElementNS(CAML_NS, 'CGPoint');
        const cx = Math.round((Number(pt?.x ?? 0)) + (layer.size.w / 2));
        const cy = Math.round(docHeight - ((Number(pt?.y ?? 0)) + (layer.size.h / 2)));
        p.setAttribute('value', `${cx} ${cy}`);
        valuesEl.appendChild(p);
      }
    } else if (keyPath === 'position.x') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const cx = Math.round((Number.isFinite(n) ? n : 0) + (layer.size.w / 2));
        const numEl = doc.createElementNS(CAML_NS, 'NSNumber');
        numEl.setAttribute('value', String(cx));
        valuesEl.appendChild(numEl);
      }
    } else if (keyPath === 'position.y') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const cy = Math.round(docHeight - ((Number.isFinite(n) ? n : 0) + (layer.size.h / 2)));
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
