import { AnyLayer, CAProject, GyroParallaxDictionary } from "../types";
import { serializeLayer } from "./serializeLayer";

export const CAML_NS = 'http://www.apple.com/CoreAnimation/1.0';

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
    layerIndex[l.id] = l;
    if (l.type === 'liquidGlass') {
      layerIndex[l.id + '_sdfLayer'] = l;
      layerIndex[l.id + '_elementLayer'] = l;
    }
    if (Array.isArray(l.children)) {
      l.children.forEach(indexWalk);
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
            defaultVal = layerIndex[override.targetId]?.rotationX;
            break;
          case "transform.rotation.y":
            defaultVal = layerIndex[override.targetId]?.rotationY;
            break;
          case "opacity":
            defaultVal = layerIndex[override.targetId].opacity;
            break;
          case "cornerRadius":
            defaultVal = layerIndex[override.targetId]?.cornerRadius;
            break;
          case "zPosition":
            defaultVal = layerIndex[override.targetId]?.zPosition;
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

    serializeLiquidGlassTransitions(stateName, layerIndex, stateOverridesInput);

    fixCornerRadiusTransitions(stateName, layerIndex, stateOverridesInput || {});

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
        if (typeof elSpec.animation.mica_autorecalculatesDuration !== 'undefined') a.setAttribute('mica_autorecalculatesDuration', String(elSpec.animation.mica_autorecalculatesDuration));
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
  ║          Website: https://caplayground.vercel.app             ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
-->`;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + asciiArt + '\n' + formatted;
}


function serializeLiquidGlassTransitions(
  stateName: string,
  layerIndex: Record<string, AnyLayer>,
  stateOverridesInput?: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>,
) {
  let liquidGlassOverrides = (stateOverridesInput || {})[stateName] || [];
  for (const override of liquidGlassOverrides) {
    const currentLayer = layerIndex[override.targetId];
    if (currentLayer?.type === 'liquidGlass') {
      if (override.keyPath === 'bounds.size.width') {
        const sdfLayerBoundOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_sdfLayer' && o.keyPath === 'bounds.size.width');
        if (sdfLayerBoundOverride) {
          sdfLayerBoundOverride.value = override.value;
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_sdfLayer',
            keyPath: 'bounds.size.width',
            value: override.value,
          });
        }
        const sdfLayerPositionOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_sdfLayer' && o.keyPath === 'position.x');
        if (sdfLayerPositionOverride) {
          sdfLayerPositionOverride.value = Number(override.value) / 2;
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_sdfLayer',
            keyPath: 'position.x',
            value: Number(override.value) / 2,
          });
        }
        const elementLayerBoundOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_elementLayer' && o.keyPath === 'bounds.size.width');

        if (elementLayerBoundOverride) {
          elementLayerBoundOverride.value = Number(override.value);
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_elementLayer',
            keyPath: 'bounds.size.width',
            value: Number(override.value),
          });
        }
        const elementLayerPositionOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_elementLayer' && o.keyPath === 'position.x');
        if (elementLayerPositionOverride) {
          elementLayerPositionOverride.value = Number(override.value) / 2;
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_elementLayer',
            keyPath: 'position.x',
            value: Number(override.value) / 2,
          });
        }
      }

      if (override.keyPath === 'bounds.size.height') {
        const sdfLayerBoundOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_sdfLayer' && o.keyPath === 'bounds.size.height');
        if (sdfLayerBoundOverride) {
          sdfLayerBoundOverride.value = Number(override.value);
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_sdfLayer',
            keyPath: 'bounds.size.height',
            value: Number(override.value),
          });
        }
        const sdfLayerPositionOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_sdfLayer' && o.keyPath === 'position.y');
        if (sdfLayerPositionOverride) {
          sdfLayerPositionOverride.value = Number(override.value) / 2;
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_sdfLayer',
            keyPath: 'position.y',
            value: Number(override.value) / 2,
          });
        }
        const elementLayerBoundOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_elementLayer' && o.keyPath === 'bounds.size.height');

        if (elementLayerBoundOverride) {
          elementLayerBoundOverride.value = Number(override.value);
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_elementLayer',
            keyPath: 'bounds.size.height',
            value: Number(override.value),
          });
        }
        const elementLayerPositionOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_elementLayer' && o.keyPath === 'position.y');
        if (elementLayerPositionOverride) {
          elementLayerPositionOverride.value = Number(override.value) / 2;
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_elementLayer',
            keyPath: 'position.y',
            value: Number(override.value) / 2,
          });
        }
      }
      if (override.keyPath === 'cornerRadius') {
        const elementLayerOverride = liquidGlassOverrides.find((o) => o.targetId === override.targetId + '_elementLayer' && o.keyPath === 'cornerRadius');
        if (elementLayerOverride) {
          elementLayerOverride.value = override.value;
        } else {
          liquidGlassOverrides.push({
            targetId: override.targetId + '_elementLayer',
            keyPath: 'cornerRadius',
            value: override.value,
          });
        }
      }
    }
  }
}

function fixCornerRadiusTransitions(stateName: string, layerIndex: Record<string, AnyLayer>, stateOverridesInput: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>) {
  const overrides = stateOverridesInput[stateName];
  if (!overrides) return;
  for (const override of overrides) {
    const currentLayer = layerIndex[override.targetId];
    if (override.keyPath === 'cornerRadius') {
      const widthOverride = overrides
        .find((o) => o.targetId === override.targetId && o.keyPath === 'bounds.size.width');
      const heightOverride = overrides
        .find((o) => o.targetId === override.targetId && o.keyPath === 'bounds.size.height');
      override.value = Math.min(
        Number(override.value),
        Number(widthOverride?.value ?? currentLayer?.size.w ?? 0) / 2,
        Number(heightOverride?.value ?? currentLayer?.size.h ?? 0) / 2,
      );
    }
  }
}