import type { VineStyle } from "./vines";

export interface Range {
  min: number;
  max: number;
}

/** How one element's particles look and move, in world pixels and milliseconds. */
export interface ParticleStyle {
  lifespan: Range;
  speedX?: Range;
  speedY?: Range;
  /** Bursts out in a random direction at this speed, in place of `speedX` and `speedY`. */
  speed?: Range;
  gravityY?: number;
  /** Pixel size: shrinks from `start` to `end`, or is picked once between `min` and `max`. */
  scale?: { start: number; end: number } | Range;
  /** Height in pixels from `start` to `end`, for streaks such as a falling drop. */
  stretch?: { start: number; end: number };
  /** Colors the particle passes through over its life. */
  colors?: number[];
  /** Colors one is picked from, kept for the particle's life. */
  tints?: number[];
  alpha: { start: number; end: number };
  /** Adds its light to what's behind it, for things that glow. */
  additive?: boolean;
}

/** Tiny jagged arcs of electricity that crackle off the blade for a frame or two. */
export interface BoltStyle {
  /** Bolts per second while the element emits. */
  rate: number;
  /** Pixels a bolt runs out from the blade. */
  length: Range;
  lifespan: Range;
  /** Colors one is picked from per bolt. */
  tints: number[];
  /** The hottest pixel, where the bolt leaves the blade. */
  head: number;
}

export interface OutlineFrame {
  color: number;
  alpha: number;
  /** False holds the element's particles back, e.g. lightning only sparks while it flashes. */
  emits?: boolean;
}

export interface ElementEffect {
  /**
   * The outline at `time` ms. `side` (0-3) is which of the four outline copies is drawn, so an
   * effect can run along the blade; `seed` keeps two weapons from moving in step.
   */
  outline(time: number, side: number, seed: number): OutlineFrame;
  /** Particles per second, from random pixels on the blade's edge. */
  rate: number;
  /**
   * Emit from the blade's upward-facing edge (flames) or downward-facing edge (drips and grit),
   * whatever angle it's held at. Left out, particles come from anywhere on the edge.
   */
  from?: "top" | "bottom";
  particles: ParticleStyle;
  bolts?: BoltStyle;
  /** A vine wound around the blade, drawn over it. */
  vines?: VineStyle;
}

/**
 * The pixels of one bolt, as offsets from where it leaves the blade: a skinny 1px line heading
 * in `angle`, one pixel per step, that kinks a pixel sideways now and then and rarely forks.
 */
export function boltPixels(length: number, angle: number, random: () => number) {
  const pixels: { x: number; y: number }[] = [];
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let x = 0;
  let y = 0;
  let kink = 0;
  for (let step = 1; step <= length; step++) {
    // Kink: shift the line a pixel to one side, never wider than a pixel
    if (step > 1 && random() < 0.4) kink += random() < 0.5 ? -1 : 1;
    kink = Math.max(-1, Math.min(1, kink));
    const nextX = Math.round(dx * step - dy * kink);
    const nextY = Math.round(dy * step + dx * kink);
    // A kink on a diagonal can jump two pixels: fill the gap so the line stays unbroken
    if (Math.abs(nextX - x) > 1 || Math.abs(nextY - y) > 1) {
      pixels.push({ x: Math.round((x + nextX) / 2), y: Math.round((y + nextY) / 2) });
    }
    x = nextX;
    y = nextY;
    pixels.push({ x, y });
  }
  // The odd single-pixel fork off the end
  if (length > 3 && random() < 0.2) {
    const side = random() < 0.5 ? -1 : 1;
    pixels.push({ x: Math.round(x + dx - dy * side), y: Math.round(y + dy + dx * side) });
  }
  return pixels;
}

/** A repeatable 0-1 value for `n`: lets flicker look random without per-frame state. */
function noise(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** `noise` eased between whole steps, so it wanders instead of jumping. */
function smoothNoise(n: number) {
  const i = Math.floor(n);
  const f = n - i;
  return noise(i) + (noise(i + 1) - noise(i)) * f * f * (3 - 2 * f);
}

export function lerpColor(from: number, to: number, t: number) {
  const channel = (shift: number) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

const fire: ElementEffect = {
  // Each side flickers on its own between ember red and bright orange: it burns, not strobes
  outline: (time, side, seed) => {
    const heat = smoothNoise(time / 70 + side * 3.1 + seed);
    return { color: lerpColor(0xd8300a, 0xffa020, heat), alpha: 0.75 + heat * 0.25 };
  },
  rate: 150,
  from: "top",
  particles: {
    // Flame tongues: 2px wide and yellow at the blade, thinning to 1px and speeding up as they
    // rise a few pixels, cooling through orange to red before they're gone
    lifespan: { min: 130, max: 280 },
    speedX: { min: -2, max: 2 },
    speedY: { min: -16, max: -7 },
    gravityY: -70,
    scale: { start: 2, end: 1 },
    colors: [0xfffbd0, 0xffd040, 0xff8418, 0xe83a0a, 0x8a1404],
    alpha: { start: 1, end: 0.5 },
    additive: true,
  },
};

const water: ElementEffect = {
  // One wet sheen all the way round, so it doesn't read as a bevel: a slow blue swell
  outline: (time, _side, seed) => {
    const swell = smoothNoise(time / 500 + seed);
    return { color: lerpColor(0x1448c8, 0x3a90f0, swell), alpha: 0.8 + swell * 0.2 };
  },
  rate: 4,
  from: "bottom",
  particles: {
    // Bright drops that bead on the underside, then fall and stretch into a streak as they go
    lifespan: { min: 280, max: 400 },
    speedX: { min: -0.5, max: 0.5 },
    speedY: { min: 0, max: 1 },
    gravityY: 45,
    stretch: { start: 1, end: 2 },
    colors: [0x9ad4ff, 0x5aa8ff, 0x3a80f0],
    alpha: { start: 1, end: 0.3 },
    additive: true,
  },
};

const light: ElementEffect = {
  // A faint buzz, then a hard white flash at uneven times: the bolts and sparks only fire
  // during flashes, so it zaps in bursts instead of fizzing steadily
  outline: (time, side, seed) => {
    const step = Math.floor(time / 50) + seed;
    if (noise(step) < 0.08) return { color: 0xffe860, alpha: 1, emits: true };
    // Between flashes each side buzzes on its own, a dim flicker of current
    const buzz = noise(step * 3.7 + side);
    return { color: lerpColor(0xffd84a, 0xfff07a, buzz), alpha: 0.15 + buzz * 0.3, emits: false };
  },
  rate: 60,
  particles: {
    // A pixel of spark thrown off with each burst
    lifespan: { min: 40, max: 90 },
    speed: { min: 10, max: 25 },
    tints: [0xffe860, 0xffd830, 0xffc820],
    alpha: { start: 1, end: 0 },
    additive: true,
  },
  bolts: {
    // A couple at once while it flashes; each re-zigzags every frame, so it crackles
    rate: 50,
    length: { min: 3, max: 6 },
    lifespan: { min: 60, max: 140 },
    tints: [0xffe860, 0xffd830, 0xffc820],
    head: 0xfff4b0,
  },
};

const earth: ElementEffect = {
  // A steady mossy rim under the vine
  outline: (time, _side, seed) => {
    const wave = smoothNoise(time / 1500 + seed);
    return { color: lerpColor(0x2f5a1c, 0x44702a, wave), alpha: 0.9 };
  },
  // Vines hold on: nothing comes loose
  rate: 0,
  particles: { lifespan: { min: 0, max: 0 }, alpha: { start: 0, end: 0 } },
  vines: {
    stem: { dark: 0x3a9a28, light: 0x7ae050 },
    leaf: 0xa8f070,
    turnLength: 14,
    creepMs: 4000,
  },
};

const holy: ElementEffect = {
  // Calm and solid: pure white all the way round, breathing gently brighter and dimmer
  outline: (time, _side, seed) => {
    const breath = (Math.sin(time / 900 + seed) + 1) / 2;
    return { color: 0xffffff, alpha: 0.75 + breath * 0.25 };
  },
  rate: 20,
  from: "top",
  particles: {
    // Soft motes that float straight up off the blade like dust in a sunbeam, shrinking as they go
    lifespan: { min: 900, max: 1500 },
    speedX: { min: -0.6, max: 0.6 },
    speedY: { min: -7, max: -4 },
    gravityY: -3,
    scale: { start: 2, end: 1 },
    colors: [0xffffff, 0xffffff, 0xf2f5ff],
    alpha: { start: 0.9, end: 0 },
    additive: true,
  },
};

/** How long each of a weapon's elements shows before the next takes over. */
export const ELEMENT_TURN_MS = 1500;

export const ELEMENT_EFFECTS: Record<string, ElementEffect> = { fire, water, light, earth, holy };

/** Swing trails for weapons of each element, matching their outlines. */
export const ELEMENT_SWING_COLORS: Record<string, number> = {
  fire: 0xff7a2a,
  water: 0x6ab8ff,
  light: 0xfff07a,
  earth: 0xa8b860,
  holy: 0xf8faff,
};

/** Which of a weapon's `count` elements has its turn at `time`: one shows at a time. */
export function elementTurn(time: number, seed: number, count: number) {
  return Math.floor(time / ELEMENT_TURN_MS + seed) % count;
}

/** Live bolts closer than this, in pixels, would merge into one thick one. */
const BOLT_SPACING = 4;
/** Live bolts at once: more and they crowd into a blob. */
const MAX_BOLTS = 3;

/** Whether a new bolt from `start` would stay skinny: few enough, and none right beside it. */
export function hasRoomForBolt(live: { x: number; y: number }[], start: { x: number; y: number }) {
  if (live.length >= MAX_BOLTS) return false;
  return live.every((bolt) => Math.hypot(bolt.x - start.x, bolt.y - start.y) >= BOLT_SPACING);
}
