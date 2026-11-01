import { farthestFrom, isUnderside } from "./edge-pixels";
import {
  boltPixels,
  elementTurn,
  hasRoomForBolt,
  lerpColor,
  type ElementEffect,
  type OutlineFrame,
} from "./element-effects";
import { vineGlow, vinePixels } from "./vines";

type Point = { x: number; y: number };

/** One rectangle of an element effect to draw, in the renderer's layer space. */
export interface EffectPixel {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  alpha: number;
  /** Adds its light to what's behind it; otherwise drawn as solid paint. */
  glow: boolean;
}

/** Maps a pixel of the weapon's art (relative to the art's own origin) into layer space. */
export type ToLayer = (pixel: Point) => Point;

interface Particle {
  x: number;
  y: number;
  /** The art pixel it came off, and where that pixel was last frame: it rides along with it. */
  anchor: Point;
  anchorAt: Point;
  vx: number;
  vy: number;
  /** Speed thrown off the moving blade, on top of its own, fading fast. */
  flingX: number;
  flingY: number;
  age: number;
  life: number;
  size: { start: number; end: number };
  stretch: { start: number; end: number } | null;
  colors: number[];
  alpha: { start: number; end: number };
  gravityY: number;
  glow: boolean;
}

interface Bolt {
  x: number;
  y: number;
  /** The art pixel it leaves from: a bolt stays on the blade while it lives. */
  anchor: Point;
  angle: number;
  length: number;
  color: number;
  head: number;
  age: number;
  life: number;
}

/** Random blade pixels to try for one on the underside before giving up. */
const UNDERSIDE_TRIES = 8;
/** Edge pixels to try for the highest, so rising effects come off the top. */
const TOP_PICKS = 4;
/** Longest frame step simulated, so a tab coming back from the background doesn't lurch. */
const MAX_DELTA = 50;
/** Particles ride with the spot they came off, letting go over this share of their life. */
const RELEASE_AT = 0.6;
/** Share of the blade's own speed a new particle is thrown off with. */
const FLING = 0.35;
/** How fast that thrown speed bleeds away, per second. */
const FLING_DRAG = 6;
/** A grip that moves farther than this in one frame jumped (switched hands), it didn't swing. */
const JUMP_PX = 10;
/** A tip that moves more than this share of the blade's length in one frame was flipped (the
 * character turned), not swung. */
const FLIP_SHARE = 0.75;
/** The fastest a particle is ever thrown, in pixels per second, whatever the blade did. */
const MAX_FLING = 120;

const between = ({ min, max }: { min: number; max: number }) => min + Math.random() * (max - min);
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const key = ({ x, y }: Point) => `${x},${y}`;

function capSpeed(x: number, y: number): Point {
  const speed = Math.hypot(x, y);
  if (speed <= MAX_FLING) return { x, y };
  return { x: (x / speed) * MAX_FLING, y: (y / speed) * MAX_FLING };
}

function colorAt(colors: number[], t: number) {
  if (colors.length === 1) return colors[0];
  const at = t * (colors.length - 1);
  const i = Math.min(Math.floor(at), colors.length - 2);
  return lerpColor(colors[i], colors[i + 1], at - i);
}

function spawnParticle(effect: ElementEffect, at: Point, anchor: Point, fling: Point): Particle {
  const style = effect.particles;
  let vx = style.speedX ? between(style.speedX) : 0;
  let vy = style.speedY ? between(style.speedY) : 0;
  if (style.speed) {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(style.speed);
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }
  const scale = style.scale ?? { start: 1, end: 1 };
  const picked = "min" in scale ? Math.round(between(scale)) : 0;
  return {
    ...at,
    anchor,
    anchorAt: at,
    vx,
    vy,
    flingX: fling.x,
    flingY: fling.y,
    age: 0,
    life: between(style.lifespan),
    size: "min" in scale ? { start: picked, end: picked } : scale,
    stretch: style.stretch ?? null,
    colors: style.colors ?? (style.tints ? [pick(style.tints)] : [0xffffff]),
    alpha: style.alpha,
    gravityY: style.gravityY ?? 0,
    glow: !!style.additive,
  };
}

/**
 * Everything a weapon's elements do, with no renderer: which element has its turn, the outline,
 * where particles and bolts come off the blade, how they move, and the vine. The game and the
 * page each feed it the blade and a mapping into their layer, then draw `pixels()` as they come,
 * so both show exactly the same thing.
 */
export class ElementSim {
  effects: ElementEffect[];
  seed = Math.random() * 1000;
  /** Blade edge pixels and the grip, in the art's own pixels. */
  edges: Point[] = [];
  grip: Point = { x: 0, y: 0 };
  tip: Point = { x: 0, y: 0 };
  particles: Particle[] = [];
  bolts: Bolt[] = [];
  /** Where the grip was last frame, to tell a swing from a jump. */
  gripAt: Point | null = null;
  tipAt: Point | null = null;
  /** Each edge pixel's spot last frame, to know how fast that part of the blade moves. */
  lastEdgeAt = new Map<string, Point>();
  pending = 0;
  pendingBolts = 0;
  turn = 0;
  time = 0;
  constructor(effects: ElementEffect[]) {
    this.effects = effects;
  }
  setBlade(edges: Point[], grip: Point) {
    this.edges = edges;
    this.grip = grip;
    this.tip = farthestFrom(edges, grip);
  }
  get effect() {
    return this.effects[this.turn];
  }
  /** The outline's four sides (up, right, down, left) for the element whose turn it is. */
  outline(): OutlineFrame[] {
    return [0, 1, 2, 3].map((side) =>
      this.effect.outline(this.time, side, this.seed + this.turn * 7),
    );
  }
  /**
   * Carries particles along with the spot on the blade each came off, so a swing or turn takes
   * them with it: fully while fresh, letting go as they age. When the weapon jumps (switches
   * hands) everything goes with it, so nothing is left behind where it was.
   */
  follow(toLayer: ToLayer) {
    const grip = toLayer(this.grip);
    const tip = toLayer(this.tip);
    const lastGrip = this.gripAt ?? grip;
    const lastTip = this.tipAt ?? tip;
    const bladeLength = Math.hypot(tip.x - grip.x, tip.y - grip.y);
    const jumped =
      Math.hypot(grip.x - lastGrip.x, grip.y - lastGrip.y) > JUMP_PX ||
      Math.hypot(tip.x - lastTip.x, tip.y - lastTip.y) > bladeLength * FLIP_SHARE;
    this.gripAt = grip;
    this.tipAt = tip;
    for (const p of this.particles) {
      const at = toLayer(p.anchor);
      const hold = jumped ? 1 : Math.max(0, 1 - p.age / p.life / RELEASE_AT);
      p.x += (at.x - p.anchorAt.x) * hold;
      p.y += (at.y - p.anchorAt.y) * hold;
      p.anchorAt = at;
    }
    return jumped;
  }
  /**
   * Advances to `time`. Particles and bolts spawn only when `emitting` (the weapon is shown) and
   * the outline says so; ones already out keep moving either way.
   */
  step(time: number, delta: number, toLayer: ToLayer, emitting = true) {
    const ms = Math.min(MAX_DELTA, delta);
    this.time = time;
    if (this.effects.length === 0) return;
    this.turn = elementTurn(time, this.seed, this.effects.length);
    const jumped = this.follow(toLayer);
    this.age(ms);
    const lastEdgeAt = this.lastEdgeAt;
    this.lastEdgeAt = new Map(this.edges.map((pixel) => [key(pixel), toLayer(pixel)]));
    const emits = this.outline().some((frame) => frame.emits !== false);
    if (!emitting || !emits || this.edges.length === 0) {
      if (!emitting) this.gripAt = this.tipAt = null;
      return;
    }

    const { effect } = this;
    this.pending += (effect.rate * ms) / 1000;
    while (this.pending >= 1) {
      this.pending -= 1;
      const { pixel, at } = this.edgePoint(toLayer);
      const was = jumped ? undefined : lastEdgeAt.get(key(pixel));
      // Fast swings move the blade far in a frame: spawn somewhere along the way, not in clumps
      const along = was ? Math.random() : 1;
      const start = was
        ? { x: was.x + (at.x - was.x) * along, y: was.y + (at.y - was.y) * along }
        : at;
      const seconds = ms / 1000;
      const fling = was
        ? capSpeed(((at.x - was.x) / seconds) * FLING, ((at.y - was.y) / seconds) * FLING)
        : { x: 0, y: 0 };
      const particle = spawnParticle(effect, start, pixel, fling);
      particle.anchorAt = at;
      this.particles.push(particle);
    }

    const style = effect.bolts;
    if (!style) return;
    const grip = toLayer(this.grip);
    this.pendingBolts += (style.rate * ms) / 1000;
    while (this.pendingBolts >= 1) {
      this.pendingBolts -= 1;
      const { pixel, at: start } = this.edgePoint(toLayer);
      if (!hasRoomForBolt(this.bolts, start)) continue;
      this.bolts.push({
        x: Math.floor(start.x),
        y: Math.floor(start.y),
        anchor: pixel,
        // Leave the blade outward, away from the grip
        angle: Math.atan2(start.y - grip.y, start.x - grip.x) + (Math.random() - 0.5) * 1.4,
        length: Math.round(between(style.length)),
        color: pick(style.tints),
        head: style.head,
        age: 0,
        life: between(style.lifespan),
      });
    }
  }
  age(ms: number) {
    const seconds = ms / 1000;
    this.particles = this.particles.filter((p) => {
      p.age += ms;
      p.vy += p.gravityY * seconds;
      const drag = Math.exp(-FLING_DRAG * seconds);
      p.flingX *= drag;
      p.flingY *= drag;
      p.x += (p.vx + p.flingX) * seconds;
      p.y += (p.vy + p.flingY) * seconds;
      return p.age < p.life;
    });
    this.bolts = this.bolts.filter((bolt) => (bolt.age += ms) < bolt.life);
  }
  /** Where the next particle or bolt leaves the blade: the art pixel, and where it is in layer space. */
  edgePoint(toLayer: ToLayer): { pixel: Point; at: Point } {
    const { from } = this.effect;
    const sample = () => {
      const pixel = pick(this.edges);
      return { pixel, at: toLayer(pixel) };
    };
    if (from === "bottom") {
      // The lower of two underside pixels: drips lean toward where water would run down,
      // without all falling from one spot
      const grip = toLayer(this.grip);
      const tip = toLayer(this.tip);
      const underside = () => {
        for (let i = 0; i < UNDERSIDE_TRIES; i++) {
          const point = sample();
          if (isUnderside(point.at, grip, tip)) return point;
        }
        return sample();
      };
      const a = underside();
      const b = underside();
      return a.at.y > b.at.y ? a : b;
    }
    // Rising effects keep the highest of a few picks, so flames lick off the top edge
    let point = sample();
    for (let i = 1; i < (from === "top" ? TOP_PICKS : 1); i++) {
      const other = sample();
      if (other.at.y < point.at.y) point = other;
    }
    return point;
  }
  /** What to draw this frame: particles, bolts and the vine, in layer space. */
  pixels(toLayer: ToLayer): EffectPixel[] {
    const out: EffectPixel[] = [];
    for (const p of this.particles) {
      const t = p.age / p.life;
      const size = Math.max(1, Math.round(p.size.start + (p.size.end - p.size.start) * t));
      const tall = p.stretch
        ? Math.max(1, Math.round(p.stretch.start + (p.stretch.end - p.stretch.start) * t))
        : size;
      out.push({
        // Streaks hang up from the particle, trailing behind a falling drop
        x: Math.round(p.x - size / 2),
        y: Math.round(p.y - tall + size / 2),
        width: size,
        height: tall,
        color: colorAt(p.colors, t),
        alpha: p.alpha.start + (p.alpha.end - p.alpha.start) * t,
        glow: p.glow,
      });
    }
    for (const bolt of this.bolts) {
      // A fresh zigzag every frame, so a live bolt crackles instead of hanging still
      const from = toLayer(bolt.anchor);
      boltPixels(bolt.length, bolt.angle, Math.random).forEach(({ x, y }, i) => {
        const color = i === 0 ? bolt.head : bolt.color;
        out.push({
          x: Math.floor(from.x) + x,
          y: Math.floor(from.y) + y,
          width: 1,
          height: 1,
          color,
          alpha: 1,
          glow: true,
        });
      });
    }
    const vines = this.effects.length > 0 ? this.effect.vines : undefined;
    if (vines) {
      const alpha = vineGlow(this.time, this.seed);
      const seed = this.seed + this.turn;
      for (const pixel of vinePixels(this.edges, this.grip, this.tip, vines, this.time, seed)) {
        const { x, y } = toLayer(pixel);
        const color = pixel.color;
        out.push({
          x: Math.floor(x),
          y: Math.floor(y),
          width: 1,
          height: 1,
          color,
          alpha,
          glow: true,
        });
      }
    }
    return out;
  }
}
