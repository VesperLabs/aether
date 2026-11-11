import type Phaser from "phaser";
import type { Point } from "@/rules/world";
import { FIRE_LIGHT_KEY, addLight } from "./lights";

/** One light a lit tile gives off, flickering and drifting so it never sits still. */
interface LightLayer {
  /** Its own falloff texture, colored in (`FIRE_LIGHT_KEY`), instead of `color` on the plain one. */
  texture?: string;
  color: number;
  radius: number;
  intensity: number;
  /** How far it dips below `intensity`, 0 to 1. */
  flicker: number;
  /** How fast it flickers, in waves a second. */
  speed: number;
  /** How far it wanders from the tile's middle, in pixels. */
  drift: number;
  /** Where its middle sits from the tile's middle (fires burn above their logs, lanterns hang off-centre). */
  offsetX?: number;
  offsetY?: number;
  /** How much its size swells and shrinks with the flicker, 0 to 1. */
  breathe?: number;
  /** The layers drawn over it that it doesn't light (see `Light`). */
  blockedBy?: readonly string[];
}

/** A fire is one light with its own colors (`FIRE_LIGHT_KEY`): one shape, no seams between layers. */
const FIRE: readonly LightLayer[] = [
  {
    texture: FIRE_LIGHT_KEY,
    color: 0xffffff,
    radius: 180,
    intensity: 0.95,
    flicker: 0.14,
    speed: 7,
    drift: 1.5,
    offsetY: -3,
    breathe: 0.02,
  },
];

/** A street lamp's lantern: a cool, steady glow with the faintest flicker, centred `x, y` in its tile. */
const lantern = (x: number, y: number): readonly LightLayer[] => [
  {
    color: 0xb8dcff,
    radius: 120,
    intensity: 0.85,
    flicker: 0.05,
    speed: 2,
    drift: 0,
    offsetX: x,
    offsetY: y,
    /* Up among the roofs: it lights them, and its own lantern */
    blockedBy: [],
  },
];

/**
 * Warm light from inside a house, through a window or an open door: a candle's slow, small
 * flicker. Things standing in front of the house (`Extras`: trees, barrels) stay dark; the roof
 * over it doesn't cut the glow off.
 */
const houseLight = (
  x: number,
  y: number,
  { radius = 60, intensity = 0.75 } = {},
): readonly LightLayer[] => [
  {
    color: 0xffad55,
    radius,
    intensity,
    flicker: 0.1,
    speed: 2.5,
    drift: 0,
    offsetX: x,
    offsetY: y,
    blockedBy: ["Extras"],
  },
];

/** Tiles that give off light at night, by tileset and tile id (the first frame of an animation). */
const LIT_TILES: ReadonlyArray<{ tileset: string; id: number; layers: readonly LightLayer[] }> = [
  /* The campfire flame */
  { tileset: "tileset-extras", id: 276, layers: FIRE },
  /* The town's street lamps, hanging right and left of their posts: the tile with the glass */
  { tileset: "tileset-town", id: 229, layers: lantern(-6, -5) },
  { tileset: "tileset-town", id: 302, layers: lantern(6, -4) },
  /* Square windows, in their frames */
  { tileset: "tileset-town", id: 30, layers: houseLight(0, 5) },
  { tileset: "tileset-town", id: 158, layers: houseLight(0, 5) },
  /* The round gable window: its lower half's tile, lighting the upper half among the roofs too */
  { tileset: "tileset-town", id: 225, layers: houseLight(0, -10) },
  /* The half-round gable window over the blue-roof cottages' porches, its wheel on blue glass */
  { tileset: "tileset-town", id: 88, layers: houseLight(0, -2) },
  /* Open doorways (the plank house, the blue-roof cottage): their lower tile, spilling out onto the steps */
  { tileset: "tileset-town", id: 283, layers: houseLight(0, -8, { radius: 96, intensity: 0.85 }) },
  { tileset: "tileset-town", id: 299, layers: houseLight(0, -8, { radius: 96, intensity: 0.85 }) },
];

/** Uneven flicker: two waves at unrelated speeds, so it never settles into a steady pulse. */
const wobble = (seconds: number, speed: number, seed: number) =>
  (Math.sin(seconds * speed + seed) + Math.sin(seconds * speed * 2.7 + seed * 1.9)) / 2;

/** How fast a fire sways; all its layers sway together, so they stay one light. */
const SWAY_SPEED = 2;

function addLayerLight(at: Point, layer: LightLayer, seed: number, swaySeed: number) {
  const {
    texture,
    color,
    radius,
    intensity,
    flicker,
    speed,
    drift,
    offsetX = 0,
    offsetY = 0,
    breathe = 0,
    blockedBy,
  } = layer;
  return addLight({
    texture,
    blockedBy,
    color,
    get radius() {
      const seconds = performance.now() / 1000;
      return radius * (1 + breathe * wobble(seconds, speed / 2, seed + 2));
    },
    get intensity() {
      const seconds = performance.now() / 1000;
      return intensity * (1 - flicker / 2 + (flicker / 2) * wobble(seconds, speed, seed));
    },
    position: () => {
      const seconds = performance.now() / 1000;
      return {
        x: at.x + offsetX + drift * wobble(seconds, SWAY_SPEED, swaySeed + 4),
        y: at.y + offsetY + drift * wobble(seconds, SWAY_SPEED, swaySeed + 8),
      };
    },
  });
}

/** Lights every lit tile on `map` until the returned function is called. */
export function addTileLights(map: Phaser.Tilemaps.Tilemap): () => void {
  const removers: Array<() => void> = [];
  for (const { tileset, id, layers } of LIT_TILES) {
    const set = map.getTileset(tileset);
    if (!set) continue;
    const gid = set.firstgid + id;
    for (const data of map.layers) {
      for (const row of data.data) {
        for (const tile of row) {
          if (tile.index !== gid) continue;
          const at = { x: tile.pixelX + tile.width / 2, y: tile.pixelY + tile.height / 2 };
          /* Each fire, and each layer of it, flickers out of step with the rest */
          const seed = (tile.x * 7 + tile.y * 13) % 10;
          layers.forEach((layer, i) =>
            removers.push(addLayerLight(at, layer, seed + i * 3.3, seed)),
          );
        }
      }
    }
  }
  return () => removers.forEach((remove) => remove());
}
