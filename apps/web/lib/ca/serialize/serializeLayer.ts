import { degToRad, hexToForegroundColor } from "@/lib/utils";
import { Animations, AnyLayer, CAProject, EmitterLayer, GyroParallaxDictionary, KeyPath, ReplicatorLayer, TextLayer, VideoLayer } from "../types";
import { CAML_NS } from "./serializeCAML";
import { findById } from "@/lib/editor/layer-utils";

function setAttr(el: Element, name: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === '') return;
  el.setAttribute(name, String(value));
}

function serializeLiquidGlassLayer(doc: XMLDocument, el: Element, layer: AnyLayer) {
  setAttr(el, 'caplayKind', 'liquidGlass');
  const filters = doc.createElementNS(CAML_NS, 'filters');
  const displacementMap = doc.createElementNS(CAML_NS, 'CAFilter');
  setAttr(displacementMap, 'filter', 'displacementMap');
  setAttr(displacementMap, 'name', 'displacementMap');
  setAttr(displacementMap, 'inputSourceSublayerName', 'sdfLayer');
  setAttr(displacementMap, 'inputOffset', '0 0');
  setAttr(displacementMap, 'inputAmount', '-80');
  filters.appendChild(displacementMap);
  const sublayers = doc.createElementNS(CAML_NS, 'sublayers');
  const sdfLayer = doc.createElementNS(CAML_NS, 'CASDFLayer');
  setAttr(sdfLayer, 'allowsEdgeAntialiasing', '1');
  setAttr(sdfLayer, 'allowsGroupOpacity', '1');
  setAttr(sdfLayer, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  setAttr(sdfLayer, 'contentsFormat', 'RGBA8');
  setAttr(sdfLayer, 'cornerCurve', 'circular');
  setAttr(sdfLayer, 'id', layer.id + '_sdfLayer');
  setAttr(sdfLayer, 'name', 'sdfLayer');
  setAttr(sdfLayer, 'position', `${Math.round(layer.size.w / 2)} ${Math.round(layer.size.h / 2)}`);
  const effectEl = doc.createElementNS(CAML_NS, 'effect');
  setAttr(effectEl, 'type', 'CASDFGlassDisplacementEffect');
  setAttr(effectEl, 'height', '40');
  setAttr(effectEl, 'maskOffset', '0');
  sdfLayer.appendChild(effectEl);
  const sdfSublayers = doc.createElementNS(CAML_NS, 'sublayers');
  // const caLayer = doc.createElementNS(CAML_NS, 'CALayer');
  // setAttr(caLayer, 'allowsEdgeAntialiasing', '1');
  // setAttr(caLayer, 'allowsGroupOpacity', '1');
  // setAttr(caLayer, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  // setAttr(caLayer, 'contentsFormat', 'RGBA8');
  // setAttr(caLayer, 'cornerCurve', 'circular');
  // setAttr(caLayer, 'name', 'caLayer');
  // setAttr(caLayer, 'position', `${Math.round(layer.size.w / 2)} ${Math.round(layer.size.h / 2)}`);
  // const caSubLayers = doc.createElementNS(CAML_NS, 'sublayers');
  const elementLayer = doc.createElementNS(CAML_NS, 'CASDFElementLayer');
  setAttr(elementLayer, 'allowsEdgeAntialiasing', '1');
  setAttr(elementLayer, 'allowsGroupOpacity', '1');
  setAttr(elementLayer, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  setAttr(elementLayer, 'contentsFormat', 'RGBA8');
  setAttr(elementLayer, 'cornerCurve', 'continuous');
  setAttr(elementLayer, 'id', layer.id + '_elementLayer');
  setAttr(elementLayer, 'name', 'elementLayer');
  setAttr(elementLayer, 'cornerRadius', layer.cornerRadius);
  setAttr(elementLayer, 'position', `${Math.round(layer.size.w / 2)} ${Math.round(layer.size.h / 2)}`);
  // caSubLayers.appendChild(elementLayer);
  // caLayer.appendChild(caSubLayers);
  sdfSublayers.appendChild(elementLayer);
  sdfLayer.appendChild(sdfSublayers);
  sublayers.appendChild(sdfLayer);
  el.appendChild(filters);
  el.appendChild(sublayers);
}

export function serializeLayer(
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
    liquidGlass: 'CABackdropLayer',
    default: 'CALayer',
  }

  const elementType = elementTypes[layer.type] || elementTypes[(layer as any)._displayType] || elementTypes.default;
  const el = doc.createElementNS(CAML_NS, elementType);
  setAttr(el, 'id', layer.id);
  setAttr(el, 'name', layer.name);
  setAttr(el, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  setAttr(el, 'position', `${layer.position.x} ${layer.position.y}`);
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

  if (layer.filters && layer.type !== 'liquidGlass') {
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
  setAttr(el, 'cornerRadius', Math.min(layer.cornerRadius || 0, layer.size.w / 2, layer.size.h / 2));
  setAttr(el, 'borderColor', layer.borderColor);
  setAttr(el, 'borderWidth', layer.borderWidth);
  setAttr(el, 'allowsEdgeAntialiasing', '1');
  setAttr(el, 'allowsGroupOpacity', '1');
  setAttr(el, 'contentsFormat', 'RGBA8');
  setAttr(el, 'cornerCurve', 'circular');

  if (layer.type === 'liquidGlass') {
    serializeLiquidGlassLayer(doc, el, layer);
  }
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

      const isRotation = dict.keyPath === 'transform.rotation.z' || dict.keyPath === 'transform.rotation.x' || dict.keyPath === 'transform.rotation.y';
      
      let HomeValue = stateOverridesInput?.Unlock.find((d) => d.keyPath === dict.keyPath && d.targetId === dict.targetId)?.value;
      let SleepValue = stateOverridesInput?.Sleep.find((d) => d.keyPath === dict.keyPath && d.targetId === dict.targetId)?.value;
      let LockedValue = dict.value;
      
      if (isRotation) {
        if (typeof HomeValue === 'number') HomeValue = degToRad(HomeValue).toFixed(5);
        if (typeof SleepValue === 'number') SleepValue = degToRad(SleepValue).toFixed(5);
        if (typeof LockedValue === 'number') LockedValue = degToRad(LockedValue).toFixed(5);
      }
      
      const v_home = doc.createElementNS(CAML_NS, 'v_home');
      v_home.setAttribute('type', 'real');
      v_home.setAttribute('value', String(HomeValue));
      nsDict.appendChild(v_home);
      const v_lock = doc.createElementNS(CAML_NS, 'v_lock');
      v_lock.setAttribute('type', 'real');
      v_lock.setAttribute('value', String(LockedValue));
      nsDict.appendChild(v_lock);
      const v_sleep = doc.createElementNS(CAML_NS, 'v_sleep');
      v_sleep.setAttribute('type', 'real');
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

  const animations = layer.animations || []
  if (animations.length > 0) {
    const animationsEl = doc.createElementNS(CAML_NS, 'animations');
    // This ensures proper 3D transformation order: rotation.y must be processed before other rotation properties to avoid flickering
    const orderedAnimations = [...animations].sort((a, b) => {
      const priority = (kp: unknown) => {
        if (kp === 'transform.rotation.y') return 0;
        return 1;
      };
      return priority(a?.keyPath) - priority(b?.keyPath);
    });
    orderedAnimations.forEach((anim, index) => {
      if (anim?.enabled && Array.isArray(anim.values) && anim.values.length > 0) {
        const keyPath = (anim.keyPath ?? 'position') as KeyPath;
        const a = doc.createElementNS(CAML_NS, index == 0 ? 'animation' : 'p');
        a.setAttribute('key', `animation-${index}`);
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
      }
    });
    el.appendChild(animationsEl);
  }

  return el;
}