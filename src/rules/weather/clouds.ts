import { roll } from "./roll";
import { driftAt } from "./wind";

/** How many cloud shapes there are; each cloud is one of them. */
export const CLOUD_SHAPES = 12;
/** Clouds sit one per cell of a grid this size, px, so they are spread out, never bunched. */
const CELL = 750;
/** How far a cloud may sit from its cell's middle, as a share of the cell. */
const JITTER = 0.22;
/**
 * Two grids drifting at their own share of the wind, so clouds pass one another. Each has its own
 * salt, so their clouds differ, and a share of its cells hold a cloud.
 */
const LAYERS = [
  { speed: 0.85, salt: 11, share: 0.55 },
  { speed: 1.15, salt: 23, share: 0.5 },
] as const;

/** A cloud overhead: where its middle is in the world, which shape, and whether it's mirrored. */
export interface CloudSpot {
  x: number;
  y: number;
  shape: number;
  flip: boolean;
}

/** A whole number from a map's name, so each map has its own clouds. */
function seedOf(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
  return h;
}

/**
 * The clouds over `area` of the map `mapName` at `now` (a real date in ms), when the sky is cloudy.
 * Worked out from the time alone: every player sees the same clouds in the same places, and they
 * are where the wind took them while you were indoors.
 */
export function cloudsOver(
  mapName: string,
  now: number,
  area: { left: number; top: number; right: number; bottom: number },
): CloudSpot[] {
  const drift = driftAt(now);
  const seed = seedOf(mapName);
  const spots: CloudSpot[] = [];
  for (const layer of LAYERS) {
    const dx = drift.x * layer.speed;
    const dy = drift.y * layer.speed;
    /* The cells whose clouds could reach the area, a cell further each way for the jitter */
    const left = Math.floor((area.left - dx) / CELL) - 1;
    const right = Math.floor((area.right - dx) / CELL) + 1;
    const top = Math.floor((area.top - dy) / CELL) - 1;
    const bottom = Math.floor((area.bottom - dy) / CELL) + 1;
    for (let cy = top; cy <= bottom; cy++) {
      for (let cx = left; cx <= right; cx++) {
        const salt = layer.salt ^ seed;
        if (roll(cx, salt, cy) >= layer.share) continue;
        spots.push({
          x: (cx + 0.5 + (roll(cx, salt + 1, cy) - 0.5) * 2 * JITTER) * CELL + dx,
          y: (cy + 0.5 + (roll(cx, salt + 2, cy) - 0.5) * 2 * JITTER) * CELL + dy,
          shape: Math.floor(roll(cx, salt + 3, cy) * CLOUD_SHAPES),
          flip: roll(cx, salt + 4, cy) < 0.5,
        });
      }
    }
  }
  return spots;
}
