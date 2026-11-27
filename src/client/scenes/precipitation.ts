import Phaser from "phaser";
import { getMapByName } from "@/content";
import type { Fall } from "@/rules/weather";
import { currentWind, skyOver } from "./clouds";
import { stormStrength } from "./storm-strength";
import type { SceneMain } from "./main-scene";
import { worldNow } from "./world-clock";
import { PRECIPITATION_DEPTH } from "./world-depths";

/** Each sheet's texture is this many world pixels square, and tiles across the view. */
const TILE = 128;
/** Ms for it to come on or stop as the sky turns. */
const FADE_MS = 6000;

/** One sheet of falling drops: how many per tile, how fast they fall and blow, and how far off. */
interface Sheet {
  drops: number;
  /** Fall speed, world px/s. */
  fall: number;
  /** How much of the wind's drift it takes. */
  wind: number;
  /** How much it moves with the camera: under 1 is further off. */
  parallax: number;
  /** How far it sways side to side, px (snow drifts, rain doesn't). */
  sway: number;
  alpha: number;
  /** Draws one drop at (x, y). */
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}

const dot = (ctx: CanvasRenderingContext2D, x: number, y: number) => ctx.fillRect(x, y, 1, 1);
const cross = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillRect(x, y - 1, 1, 3);
  ctx.fillRect(x - 1, y, 3, 1);
};
const streak = (length: number) => (ctx: CanvasRenderingContext2D, x: number, y: number) =>
  ctx.fillRect(x, y, 1, length);

/**
 * What falls in each sky, far sheet to near: smaller, sparser and slower far off, so the fall has
 * depth. Each sheet is one tiled texture scrolled down and on the wind, never a particle per drop.
 */
const FALLS: Record<Fall, { color: string; sheets: Sheet[] }> = {
  snow: {
    color: "#ffffff",
    sheets: [
      { drops: 70, fall: 14, wind: 0.6, parallax: 0.85, sway: 3, alpha: 0.55, draw: dot },
      { drops: 36, fall: 24, wind: 0.8, parallax: 0.93, sway: 4, alpha: 0.8, draw: dot },
      { drops: 14, fall: 36, wind: 1, parallax: 1, sway: 6, alpha: 0.95, draw: cross },
    ],
  },
  rain: {
    color: "#c4d8ec",
    sheets: [
      { drops: 40, fall: 220, wind: 1.5, parallax: 0.85, sway: 0, alpha: 0.3, draw: streak(3) },
      { drops: 24, fall: 300, wind: 2, parallax: 0.93, sway: 0, alpha: 0.4, draw: streak(5) },
      { drops: 12, fall: 380, wind: 2.5, parallax: 1, sway: 0, alpha: 0.5, draw: streak(7) },
    ],
  },
};
const FALL_KINDS = Object.keys(FALLS) as Fall[];

/**
 * How hard it falls in showers and in a full storm; between them it eases with the storm's strength
 * (see `stormStrength`). A storm brings in the nearest sheet, falling faster and blown harder.
 */
const SHOWERS = { alpha: 0.75, speed: 1, wind: 1 };
const STORM = { alpha: 1, speed: 1.35, wind: 1.6 };
/** Sheets from this one on only show in a storm, fading in with it. */
const STORM_SHEETS_FROM = 2;

/** Each kind's sheets and how hard it falls now, 0 to 1, eased toward the sky's. */
let falls: {
  kind: Fall;
  sprites: Phaser.GameObjects.TileSprite[];
  shown: number;
  /** How far each sheet has fallen and blown, px: added up each frame, so a change of pace never jumps. */
  offsets: { x: number; y: number }[];
}[] = [];
/** The map shown last frame, so a new one opens under the sky it has rather than fading it in. */
let shownMap: string | undefined;

/** `value` wrapped into one tile, 0 up to `TILE`. */
const wrap = (value: number) => ((value % TILE) + TILE) % TILE;

/** A small seeded generator, so every player's drops are laid out alike. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Draws a sheet's drops once. */
function createSheetTexture(scene: Phaser.Scene, kind: Fall, index: number) {
  const key = `${kind}-sheet-${index}`;
  if (scene.textures.exists(key)) return key;
  const fall = FALLS[kind];
  const sheet = fall.sheets[index];
  const texture = scene.textures.createCanvas(key, TILE, TILE) as Phaser.Textures.CanvasTexture;
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const ctx = texture.getContext();
  const random = seeded(index + 1);
  ctx.fillStyle = fall.color;
  for (let i = 0; i < sheet.drops; i++) {
    sheet.draw(ctx, Math.floor(random() * TILE), Math.floor(random() * TILE));
  }
  texture.refresh();
  return key;
}

function fallsOf(scene: SceneMain) {
  if (falls[0]?.sprites[0]?.scene === scene) return falls;
  falls = FALL_KINDS.map((kind) => ({
    kind,
    shown: 0,
    offsets: FALLS[kind].sheets.map(() => ({ x: 0, y: 0 })),
    sprites: FALLS[kind].sheets.map((_, index) => {
      const sprite = scene.add
        .tileSprite(0, 0, 1, 1, createSheetTexture(scene, kind, index))
        .setScrollFactor(0)
        .setDepth(PRECIPITATION_DEPTH)
        .setVisible(false);
      scene.minimap?.ignore(sprite);
      return sprite;
    }),
  }));
  scene.events.once("shutdown", () => {
    falls = [];
    shownMap = undefined;
  });
  return falls;
}

/**
 * Lets snow or rain fall over outdoor maps through showers and storms (snow in winter, rain
 * otherwise), and stops it when it turns. The sheets are pinned to the screen and scrolled to match
 * the world, so drops fall in place as the camera moves.
 */
export function updatePrecipitation(scene: SceneMain, delta: number) {
  const map = getMapByName(scene.roomName);
  const local = map?.isOutdoors ? skyOver(scene) : undefined;
  const storm = stormStrength();
  /* A new map opens under the sky it has, already there */
  const isNewMap = shownMap !== scene.roomName;
  shownMap = scene.roomName;
  const step = delta / FADE_MS;
  for (const fall of fallsOf(scene)) {
    const target = local?.fall === fall.kind ? 1 : 0;
    fall.shown = isNewMap
      ? target
      : fall.shown + Phaser.Math.Clamp(target - fall.shown, -step, step);
    if (fall.shown <= 0) {
      for (const sprite of fall.sprites) sprite.setVisible(false);
      continue;
    }
    drawFall(scene, fall, storm, delta);
  }
}

function drawFall(scene: SceneMain, fall: (typeof falls)[number], storm: number, delta: number) {
  const camera = scene.cameras.main;
  /* Pinned to the screen: the camera zooms round its middle, so cover the view from there */
  const width = Math.ceil(camera.width / camera.zoom) + 2;
  const height = Math.ceil(camera.height / camera.zoom) + 2;
  const seconds = worldNow() / 1000;
  const wind = currentWind();
  const pace = {
    alpha: Phaser.Math.Linear(SHOWERS.alpha, STORM.alpha, storm),
    speed: Phaser.Math.Linear(SHOWERS.speed, STORM.speed, storm),
    wind: Phaser.Math.Linear(SHOWERS.wind, STORM.wind, storm),
  };
  FALLS[fall.kind].sheets.forEach((sheet, index) => {
    const sprite = fall.sprites[index];
    const share = index >= STORM_SHEETS_FROM ? storm : 1;
    sprite.setVisible(share > 0);
    if (share <= 0) return;
    if (sprite.width !== width || sprite.height !== height) sprite.setSize(width, height);
    sprite
      .setPosition(camera.width / 2, camera.height / 2)
      .setAlpha(sheet.alpha * pace.alpha * share * fall.shown);
    /* Fallen and blown a little more this frame, kept within one tile so it never loses precision */
    const offset = fall.offsets[index];
    const blow = wind.speed * sheet.wind * pace.wind * (delta / 1000);
    offset.x = wrap(offset.x + Math.cos(wind.angle) * blow);
    offset.y = wrap(
      offset.y + Math.sin(wind.angle) * blow + sheet.fall * pace.speed * (delta / 1000),
    );
    /* Where the view is, less how far this sheet has fallen and blown, and a gentle sway */
    const sway = Math.sin(seconds * 0.7 + index * 2) * sheet.sway;
    const x = camera.scrollX * sheet.parallax - offset.x + sway;
    const y = camera.scrollY * sheet.parallax - offset.y;
    sprite.setTilePosition(wrap(Math.round(x - width / 2)), wrap(Math.round(y - height / 2)));
  });
}
