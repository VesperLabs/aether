type Point = { x: number; y: number };

export interface VinePixel extends Point {
  color: number;
}

/** How a vine winds around a blade, in the weapon art's pixels and milliseconds. */
export interface VineStyle {
  /** Stem colors: shaded where the vine turns away, lit where it faces out. */
  stem: { dark: number; light: number };
  leaf: number;
  /** Pixels of blade per full turn of the vine. */
  turnLength: number;
  /** Milliseconds for the vine to creep one turn along. */
  creepMs: number;
}

/**
 * How brightly the vine glows at `time`, 0-1: it breathes slowly, as if alive. Vines are drawn
 * adding their light, like the other elements, not as solid paint.
 */
export function vineGlow(time: number, seed: number) {
  return 0.55 + 0.35 * ((Math.sin(time / 900 + seed) + 1) / 2);
}

/** How far from grip to tip the vine starts, so it winds the blade and not the handle. */
const VINE_START = 0.35;
/** How close to an edge the spiral must be to show: it hides while crossing the face. */
const EDGE_SHOWS = 0.75;
/** Pixels between leaves along the vine. */
const LEAF_EVERY = 6;
/** Pixels between curling tendrils along the vine. */
const TENDRIL_EVERY = 9;

/**
 * A vine wound around a blade at `time`: a stem that spirals from near the guard to the tip,
 * seen only where it wraps round the blade's edges (never across its face), with leaves and
 * little tendrils that curl and wave.
 * `edges` are the blade's edge pixels, in the same space as `grip` and `tip`.
 */
export function vinePixels(
  edges: Point[],
  grip: Point,
  tip: Point,
  style: VineStyle,
  time: number,
  seed: number,
) {
  const length = Math.hypot(tip.x - grip.x, tip.y - grip.y);
  if (length < 4) return [];
  const along = { x: (tip.x - grip.x) / length, y: (tip.y - grip.y) / length };
  const across = { x: -along.y, y: along.x };

  // The blade's width along its length: how far each side's edge is from the middle line
  const bins = Math.ceil(length) + 1;
  const left = new Array<number>(bins).fill(0);
  const right = new Array<number>(bins).fill(0);
  for (const pixel of edges) {
    const dx = pixel.x - grip.x;
    const dy = pixel.y - grip.y;
    const at = Math.round(dx * along.x + dy * along.y);
    if (at < 0 || at >= bins) continue;
    const side = dx * across.x + dy * across.y;
    left[at] = Math.min(left[at], side);
    right[at] = Math.max(right[at], side);
  }

  const pixels = new Map<string, VinePixel>();
  const put = (s: number, side: number, color: number) => {
    const x = Math.round(grip.x + along.x * s + across.x * side);
    const y = Math.round(grip.y + along.y * s + across.y * side);
    pixels.set(`${x},${y}`, { x, y, color });
  };

  const creep = (time / style.creepMs) * Math.PI * 2;
  for (let s = length * VINE_START; s < length - 1; s += 0.5) {
    const at = Math.round(s);
    const phase = (s / style.turnLength) * Math.PI * 2 - creep + seed;
    // Only where it wraps round an edge: crossing the face would cover the blade, so the vine
    // shows at the edges like the other effects and reads as wound round it
    const swing = Math.cos(phase);
    if (Math.abs(swing) < EDGE_SHOWS) continue;
    const outward = swing > 0 ? 1 : -1;
    const edge = outward > 0 ? right[at] : left[at];
    // Hugs the outline, stepping out a pixel at the height of each wrap
    const reach = Math.abs(swing) > 0.97 ? 2 : 1;
    const side = edge + outward * reach;
    put(s, side, Math.sin(phase) > 0 ? style.stem.light : style.stem.dark);

    // Leaves stick out from the edge
    const edgeness = Math.abs(swing);
    if (edgeness > 0.95 && at % LEAF_EVERY === 0) {
      put(s, side + outward, style.leaf);
      put(s + 1, side + outward, style.leaf);
    }

    // Tendrils: a short curl off the edge that waves, so the vine looks alive
    if (edgeness > 0.95 && at % TENDRIL_EVERY === 3) {
      const wave = Math.sin(time / 170 + at * 1.7 + seed);
      for (let step = 1; step <= 3; step++) {
        put(s + wave * step * 0.8, side + outward * step, style.stem.light);
      }
    }
  }
  return [...pixels.values()];
}
