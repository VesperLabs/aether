import Phaser from "phaser";

/** Brightness root to tip, against the hay under the stalk: its own color, darker strokes, a lit tip. */
const SHADES = [1, 0.95, 0.9, 1.08];

/** `color` with each channel scaled by `factor`. */
const shadeOf = (color: number, factor: number) =>
  [16, 8, 0].reduce(
    (out, shift) => out | (Math.min(255, Math.round(((color >> shift) & 255) * factor)) << shift),
    0,
  );
/** Blades per px of body width, and how tall they stand at scale 1. */
const BLADES_PER_PX = 0.8;
/** Roots reach this many px below the cut at most, so stalks hide its straight edge. */
const ROOT_DROP = 3;
const MIN_HEIGHT = 2;
const MAX_HEIGHT = 6;
/** How far tips sway, px: a little at rest, more while pushing through. */
const SWAY_IDLE = 0.4;
const SWAY_MOVING = 1.6;

/** How far stalks at the middle bend aside, px at scale 1, and how many px they're pressed down. */
const PART_BEND = 4;
const PART_PRESS = 2;
/** Ms for the hay to part when walking starts, and to spring back when it stops. */
const PART_MS = 180;
const SPRING_MS = 500;

/** How parted each body's hay is, 0 to 1, and when it was last drawn. */
const parting = new WeakMap<Phaser.GameObjects.Graphics, { part: number; at: number }>();

/** What each graphics last drew, so an unchanged frame keeps it. */
const looks = new WeakMap<Phaser.GameObjects.Graphics, string>();

/** A steady pseudo-random 0..1 per blade, so blades keep their height frame to frame. */
const noise = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function clearHayBlades(blades: Phaser.GameObjects.Graphics) {
  parting.delete(blades);
  if (!looks.has(blades)) return;
  looks.delete(blades);
  blades.clear();
}

/**
 * Hay stalks standing in front of a body at the line hay cuts it at, in single pixels, so the
 * cut reads as stalks rather than an edge. Walking parts them: stalks in front of the body bend
 * out to the sides and are pressed down, most at its middle, and spring back when it stops.
 */
export function drawHayBlades(
  blades: Phaser.GameObjects.Graphics,
  opts: {
    /** The body's place in the world: stalks stand at world spots, so it walks past them. */
    worldX: number;
    middle: number;
    /** The hay art's color at this point, in the rig's coordinates; stalks only grow out of hay. */
    hayColor: (x: number, y: number) => number | undefined;
    halfWidth: number;
    line: number;
    depth: number;
    scale: number;
    time: number;
    moving: boolean;
    lean: number;
  },
) {
  const { worldX, hayColor, middle, halfWidth, line, depth, scale, time, moving, lean } = opts;
  /* Stalks stand on a world grid, one per `spacing` px, so they stay put as the body moves */
  const spacing = 1 / BLADES_PER_PX;
  const first = Math.floor((worldX + middle - halfWidth) / spacing);
  const last = Math.ceil((worldX + middle + halfWidth) / spacing);
  const sway = moving ? SWAY_MOVING : SWAY_IDLE;
  const state = parting.get(blades) ?? { part: 0, at: time };
  const step = Math.min(time - state.at, 100);
  state.part = moving
    ? Math.min(1, state.part + step / PART_MS)
    : Math.max(0, state.part - step / SPRING_MS);
  state.at = time;
  parting.set(blades, state);
  const part = state.part;
  const pixels: string[] = [];
  const cells: { x: number; y: number; color: number }[] = [];
  for (let i = first; i <= last; i++) {
    /* Each stalk shows once the body is in deep enough for it, so they come in one by one */
    const grown = Phaser.Math.Clamp((depth - noise(i + 99) * 0.6) / 0.4, 0, 1);
    if (grown <= 0) continue;
    /* Scattered across, not on a grid, with roots at different heights around the cut */
    const x0 = Math.round((i + noise(i + 7)) * spacing - worldX);
    /* Thinner toward the sides, so the patch has no hard ends */
    const edge = Math.abs(x0 - middle) / Math.max(halfWidth, 1);
    if (edge > 1 || noise(i + 31) < edge * edge) continue;
    const root = line + Math.round(noise(i + 23) * ROOT_DROP * scale);
    /* Each stalk is the hay it grows from: lit art makes bright stalks, the shaded front dark ones */
    const base = hayColor(x0, root);
    if (base === undefined) continue;
    /* -1 at the left edge to 1 at the right: the middle parts most, pushed to its own side */
    const across = (x0 - middle) / Math.max(halfWidth, 1);
    const side = across < 0 ? -1 : 1;
    const push = part * (1 - Math.abs(across) * 0.6);
    const tall =
      Math.max(1, MIN_HEIGHT + noise(i) * (MAX_HEIGHT - MIN_HEIGHT) - PART_PRESS * push) *
      scale *
      grown;
    const phase = time / (moving ? 180 : 700) + noise(i + 50) * 6;
    const tip = Math.sin(phase) * sway - lean * 1.5 + side * PART_BEND * scale * push;
    /* From the root up past the cut by `tall`, so every stalk crosses it */
    const rows = Math.round(root - line + tall);
    if (rows < 1) continue;
    for (let r = 0; r <= rows; r++) {
      const along = rows ? r / rows : 0;
      const x = Math.round(x0 + tip * along * along);
      const y = root - r;
      const shade = Math.min(SHADES.length - 1, Math.floor(along * SHADES.length));
      const color = shadeOf(base, SHADES[shade]);
      cells.push({ x, y, color });
      pixels.push(`${x},${y},${color}`);
    }
  }
  const look = pixels.join(";");
  if (looks.get(blades) === look) return;
  looks.set(blades, look);
  blades.clear();
  for (const { x, y, color } of cells) {
    blades.fillStyle(color, 1);
    blades.fillRect(x, y, 1, 1);
  }
}
