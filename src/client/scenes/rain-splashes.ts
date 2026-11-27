import Phaser from "phaser";
import { getMapByName } from "@/content";
import { skyOver } from "./clouds";
import { stormStrength } from "./storm-strength";
import { isShallowAt, isWaterAt } from "./ground-terrain";
import type { SceneMain } from "./main-scene";
import { worldNow } from "./world-clock";
import { SPLASH_DEPTH } from "./world-depths";
import { drawRippleRing } from "@/client/views/splashes";

/** The ground is cut into cells this many world pixels square; each may hold one splash at a time. */
const CELL = 20;
/** How likely a cell is splashing in showers and in a storm. */
const DENSITY = { showers: 0.3, storm: 0.6 };
/** How visible the splashes are in showers and in a storm. */
const ALPHA = { showers: 0.5, storm: 0.8 };
const COLOR = 0xc4d8ec;
/** Each splash's cycle runs this long, ms, picked per cell: ground splashes are quick, ripples slow. */
const GROUND_CYCLE = { min: 300, max: 700 };
const WATER_CYCLE = { min: 700, max: 1300 };
/** Ms for the splashes to start or stop as the sky turns. */
const FADE_MS = 6000;

let graphics: Phaser.GameObjects.Graphics | undefined;
/** How hard it splashes now, 0 to 1, eased toward the sky's. */
let shown = 0;
let shownMap: string | undefined;

/** A steady 0..1 from whole numbers, so every player sees the same splash in the same place. */
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a ^ Math.imul(b, 0x9e3779b1) ^ Math.imul(c, 0x27d4eb2f), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x1_0000_0000;
}

/** A drop hitting the ground: a dot, a little crown, a wider one, gone. */
function drawSplash(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, big: boolean) {
  const spread = big ? 3 : 2;
  if (t < 0.2) return g.fillRect(x, y, 1, 1);
  if (t < 0.45) {
    g.fillRect(x - 1, y, 1, 1);
    g.fillRect(x + 1, y, 1, 1);
    return g.fillRect(x, y - 1, 1, 1);
  }
  if (t < 0.7) {
    g.fillRect(x - spread, y, 1, 1);
    g.fillRect(x + spread, y, 1, 1);
    g.fillRect(x - 1, y - spread + 1, 1, 1);
    return g.fillRect(x + 1, y - spread + 1, 1, 1);
  }
}

/**
 * A drop landing on water: the wading ripple (see `spawnRipple`), smaller and with fewer pixels,
 * drawn straight into the shared graphics with no tween or object of its own.
 */
function drawRipple(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, big: boolean) {
  const eased = 1 - (1 - t) * (1 - t);
  const rx = Math.max(1, Math.round(1 + eased * (big ? 5 : 3)));
  drawRippleRing(g, x, y, rx, Math.max(1, Math.round(rx / 2)), 0.8 * (1 - t), Math.max(6, rx * 4));
}

function graphicsOf(scene: SceneMain) {
  if (graphics?.scene === scene) return graphics;
  graphics = scene.add.graphics().setDepth(SPLASH_DEPTH);
  scene.minimap?.ignore(graphics);
  scene.events.once("shutdown", () => {
    graphics = undefined;
    shownMap = undefined;
  });
  return graphics;
}

/**
 * Splashes rain on the ground of outdoor maps, and rings it on water. Each cell of ground has its
 * own place, pace and size of splash, landing somewhere new each time, so it never looks tiled.
 * Roofs and tree tops draw over them, so nothing splashes on them.
 */
export function updateRainSplashes(scene: SceneMain, delta: number) {
  const g = graphicsOf(scene);
  const map = getMapByName(scene.roomName);
  const local = map?.isOutdoors ? skyOver(scene) : undefined;
  const goal = local?.fall === "rain" ? 1 : 0;
  if (shownMap !== scene.roomName) {
    shownMap = scene.roomName;
    shown = goal;
  }
  shown += Phaser.Math.Clamp(goal - shown, -delta / FADE_MS, delta / FADE_MS);
  g.clear();
  g.setVisible(shown > 0);
  if (shown <= 0) return;

  const storm = stormStrength();
  const density = Phaser.Math.Linear(DENSITY.showers, DENSITY.storm, storm) * shown;
  /* The whole layer's strength on the object, so a ripple's own colours can't leak into splashes */
  g.setAlpha(Phaser.Math.Linear(ALPHA.showers, ALPHA.storm, storm));
  const now = worldNow();
  const view = scene.cameras.main.worldView;
  const tilemap = scene.map;
  for (let cy = Math.floor(view.y / CELL); cy <= Math.floor(view.bottom / CELL); cy++) {
    for (let cx = Math.floor(view.x / CELL); cx <= Math.floor(view.right / CELL); cx++) {
      /* Where the cell's next drop lands decides if it ripples, so look there first */
      const probeX = cx * CELL + CELL / 2;
      const probeY = cy * CELL + CELL / 2;
      const onWater = isWaterAt(tilemap, probeX, probeY) || isShallowAt(tilemap, probeX, probeY);
      const pace = onWater ? WATER_CYCLE : GROUND_CYCLE;
      const cycle = pace.min + hash(cx, cy, 1) * (pace.max - pace.min);
      const shifted = now + hash(cx, cy, 2) * cycle;
      const round = Math.floor(shifted / cycle);
      /* Each round lands somewhere new in the cell, or skips, so the rhythm never repeats */
      if (hash(cx, cy, round) >= density) continue;
      const t = (shifted % cycle) / cycle;
      const x = cx * CELL + 2 + Math.floor(hash(round, cx, cy) * (CELL - 4));
      const y = cy * CELL + 2 + Math.floor(hash(cy, round, cx) * (CELL - 4));
      const big = hash(cx, round, 3) < 0.35;
      if (onWater) {
        drawRipple(g, x, y, t, big);
        continue;
      }
      g.fillStyle(COLOR, 1);
      drawSplash(g, x, y, t, big);
    }
  }
}
