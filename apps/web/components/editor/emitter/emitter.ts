import { Size, Vec2 } from "@/lib/ca/types";
import { clamp } from "@/lib/utils";

const tintCache = new Map<string, HTMLCanvasElement>();

export function getTintedSprite(
  img: HTMLImageElement | HTMLCanvasElement,
  tint: { r: number; g: number; b: number }
): HTMLCanvasElement | HTMLImageElement {
  if (tint.r === 1 && tint.g === 1 && tint.b === 1) return img;

  const w = img.width || (img as HTMLImageElement).naturalWidth;
  const h = img.height || (img as HTMLImageElement).naturalHeight;
  if (!w || !h) return img;

  const src = img instanceof HTMLImageElement ? img.src : "canvas";
  const cacheKey = `${src}_${tint.r}_${tint.g}_${tint.b}_${w}_${h}`;
  if (tintCache.has(cacheKey)) {
    return tintCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img;

  ctx.drawImage(img, 0, 0, w, h);

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgb(${Math.round(tint.r * 255)}, ${Math.round(tint.g * 255)}, ${Math.round(tint.b * 255)})`;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(img, 0, 0, w, h);

  ctx.globalCompositeOperation = "source-over";

  if (tintCache.size > 100) {
    const firstKey = tintCache.keys().next().value;
    if (firstKey) tintCache.delete(firstKey);
  }
  tintCache.set(cacheKey, canvas);

  return canvas;
}

export const kCAEmitterLayerShape = { point: 'point', line: 'line', rectangle: 'rectangle' };
export const kCAEmitterLayerMode = { volume: 'volume', outline: 'outline', surface: 'surface' };
export const kCAEmitterLayerRenderMode = { unordered: 'unordered', additive: 'additive' };

export class CAEmitterCell {
  id: string;
  name: string | undefined;
  src: string | undefined;
  contentsScale: number;
  birthRate: number;
  lifetime: number;
  lifetimeRange: number;
  emissionLongitude: number;
  emissionRange: number;
  emissionLatitude: number;
  velocity: number;
  velocityRange: number;
  xAcceleration: number;
  yAcceleration: number;
  contents: any;
  color: string;
  alpha: number;
  red: number;
  green: number;
  blue: number;
  scale: number;
  scaleRange: number;
  scaleSpeed: number;
  alphaRange: number;
  alphaSpeed: number;
  spin: number;
  spinRange: number;
  redRange: number;
  redSpeed: number;
  greenRange: number;
  greenSpeed: number;
  blueRange: number;
  blueSpeed: number;
  _acc: number;

  constructor() {
    this.id = '';
    this.name = undefined;
    this.src = undefined;
    this.contentsScale = 1;
    // Emission
    this.birthRate = 0;
    this.lifetime = 0;
    this.lifetimeRange = 0;
    this.emissionLongitude = 0;
    this.emissionRange = 0;
    this.emissionLatitude = 0;

    // Motion
    this.velocity = 0;
    this.velocityRange = 0;
    this.xAcceleration = 0;
    this.yAcceleration = 0;

    // Appearance
    this.contents = null;
    this.color = '#FFFFFF';
    this.alpha = 1;
    this.red = 1;
    this.green = 1;
    this.blue = 1;
    this.redRange = 0;
    this.redSpeed = 0;
    this.greenRange = 0;
    this.greenSpeed = 0;
    this.blueRange = 0;
    this.blueSpeed = 0;
    this.scale = 1;
    this.scaleRange = 0;
    this.scaleSpeed = 0;
    this.alphaRange = 0;
    this.alphaSpeed = 0;
    this.spin = 0;
    this.spinRange = 0;

    // Internals
    this._acc = 0;
  }
}

export class CAEmitterLayer {
  emitterPosition: Vec2;
  emitterZPosition: number;
  emitterSize: Size;
  emitterDepth: number;
  emitterShape: string;
  emitterMode: string;
  geometryFlipped: boolean;
  renderMode: string;
  preservesDepth: boolean;
  birthRate: number;
  lifetime: number;
  seed: number;
  speed: number;
  emitterCells: CAEmitterCell[];
  _live: any[];
  _pool: any[];
  _capacity: number;

  constructor() {
    this.emitterPosition = { x: 0, y: 0 };
    this.emitterZPosition = 0;
    this.emitterSize = { w: 0, h: 0 };
    this.emitterDepth = 0;
    this.emitterShape = kCAEmitterLayerShape.point;
    this.emitterMode = kCAEmitterLayerMode.volume;
    this.geometryFlipped = false;
    this.renderMode = kCAEmitterLayerRenderMode.unordered;
    this.preservesDepth = false;
    this.birthRate = 1;
    this.lifetime = 1;
    this.seed = (Math.random() * 1e9) | 0;
    this.speed = 1;

    this.emitterCells = [];

    // internals
    this._live = [];
    this._pool = [];
    this._capacity = 4000;
  }

  step(dt: number) {
    for (const cell of this.emitterCells) {
      const rate = (cell.birthRate * this.birthRate) * Math.max(0, this.lifetime);
      this._spawn(cell, rate * dt);
    }

    const next = [];
    for (let i = 0; i < this._live.length; i++) {
      const p = this._live[i];
      p.life -= dt; if (p.life <= 0) { this._pool.push(p); continue; }

      p.vx += p.cell.xAcceleration * dt;
      p.vy += p.cell.yAcceleration * dt;

      p.rot += p.spin * dt;
      p.scale += p.cell.scaleSpeed * dt;
      p.alpha += p.cell.alphaSpeed * dt;
      p.red += p.cell.redSpeed * dt;
      p.green += p.cell.greenSpeed * dt;
      p.blue += p.cell.blueSpeed * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      next.push(p);
    }
    this._live = next;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const additive = this.renderMode === kCAEmitterLayerRenderMode.additive;
    if (additive) ctx.globalCompositeOperation = 'lighter';

    this._live.sort((a, b) => this.emitterCells.indexOf(a.cell) - this.emitterCells.indexOf(b.cell));

    for (let i = 0; i < this._live.length; i++) {
      const p = this._live[i];
      const a = Math.max(0, Math.min(1, p.alpha));
      if (a <= 0) continue;

      const size = Math.max(0.001, p.scale) * p.baseSize;
      ctx.globalAlpha = a;

      if (p.sprite) {
        const iw = p.sprite.naturalWidth || p.sprite.width || 1;
        const ih = p.sprite.naturalHeight || p.sprite.height || 1;
        const w = Math.round(iw * p.scale / p.cell.contentsScale);
        const h = Math.round(ih * p.scale / p.cell.contentsScale);
        if (w <= 0 || h <= 0) continue;
        const tint = {
          r: clamp(p.red, 0, 1),
          g: clamp(p.green, 0, 1),
          b: clamp(p.blue, 0, 1)
        };
        const tintedSprite = getTintedSprite(p.sprite, tint) as HTMLCanvasElement;
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.spin !== 0) ctx.rotate(p.rot);
        if (!this.geometryFlipped) ctx.scale(1, -1);
        ctx.drawImage(tintedSprite, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    if (additive) ctx.globalCompositeOperation = 'source-over';
  }

  // --- internals ---
  _spawn(cell: CAEmitterCell, expected: number) {
    cell._acc += expected;
    const n = Math.floor(cell._acc);
    cell._acc -= n;
    if (!n) return;

    for (let i = 0; i < n; i++) {
      const life = this._randRange(cell.lifetime, cell.lifetimeRange);
      if (life <= 0) continue;

      const speed = this._randRange(cell.velocity, cell.velocityRange);
      const ang = this._randRangeFull(cell.emissionLongitude, cell.emissionRange);

      const { x, y } = this._emitPoint();
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed;

      const baseSize = cell.contents ? Math.max(12, (cell.contents.width || 16)) : 16;
      const scale = this._randRange(cell.scale, cell.scaleRange);
      const alpha = this._randRange(cell.alpha, cell.alphaRange);
      const blue = this._randRange(cell.blue, Math.abs(cell.blueRange));
      const red = this._randRange(cell.red, Math.abs(cell.redRange));
      const green = this._randRange(cell.green, Math.abs(cell.greenRange));
      const spin = this._randRange(cell.spin, cell.spinRange);

      const p = this._getParticle();
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.rot = 0; p.spin = spin;
      p.life = life; p.alpha = alpha;
      p.scale = scale; p.baseSize = baseSize;
      p.sprite = cell.contents || null; p.color = cell.color;
      p.cell = cell;
      p.blue = blue;
      p.red = red;
      p.green = green;

      this._live.push(p);
      if (this._live.length > this._capacity) this._live.shift();
    }
  }

  _emitPoint() {
    const ep = this.emitterPosition, es = this.emitterSize;
    switch (this.emitterShape) {
      case kCAEmitterLayerShape.point: return { x: ep.x, y: ep.y };
      case kCAEmitterLayerShape.line: {
        const t = Math.random() * es.w - es.w / 2;
        if (this.emitterMode === kCAEmitterLayerMode.volume) {
          const v = (Math.random() - 0.5) * Math.max(1, es.h);
          return { x: ep.x + t, y: ep.y + v };
        }
        return { x: ep.x + t, y: ep.y };
      }
      case kCAEmitterLayerShape.rectangle: {
        const w = es.w, h = es.h;
        if (this.emitterMode === kCAEmitterLayerMode.outline) {
          const per = 2 * (w + h);
          let d = Math.random() * per;
          if (d < w) return { x: ep.x - w / 2 + d, y: ep.y - h / 2 };
          d -= w; if (d < h) return { x: ep.x + w / 2, y: ep.y - h / 2 + d };
          d -= h; if (d < w) return { x: ep.x + w / 2 - d, y: ep.y + h / 2 };
          d -= w; return { x: ep.x - w / 2, y: ep.y + h / 2 - d };
        }
        return { x: ep.x + (Math.random() - 0.5) * w, y: ep.y + (Math.random() - 0.5) * h };
      }
      default: return { x: ep.x, y: ep.y };
    }
  }

  _getParticle() { return this._pool.length ? this._pool.pop() : {}; }
  _randRange(base: number, range: number) { return base + (Math.random() - 0.5) * (range || 0); }
  _randRangeFull(base: number, range: number) { return base + (Math.random() * 2 - 1) * (range || 0); }
}
