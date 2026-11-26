import Phaser from "phaser";
import { getMapByName } from "@/content";
import { driftAt } from "@/rules/weather";
import { drawFogArt } from "./fog-art";
import { clearPuffKicks, drawPuffs } from "./fog-puffs";
import { clearSwirls, feetOf, leaveSwirls, swirlsAt } from "./fog-swirls";
import type { SceneMain } from "./main-scene";
import { currentSky } from "./clouds";
import { getNpcs, getPlayers } from "./scene-entities";
import { worldNow } from "./world-clock";
import { GROUND_FOG_DEPTH } from "./world-depths";

/** The mist texture's size, px: it tiles, so this is how often the pattern repeats. */
const MIST_SIZE = 256;
const MIST_KEY = "fog-mist";
/** How much the mist pattern is scaled up, how fast it drifts for the wind, and how thick it is. */
const MIST_SCALE = 3;
const MIST_SPEED = 0.6;
/** Thin: the puffs over it carry the mist, the blanket only fills the gaps between them. */
const MIST_ALPHA = 0.4;
/** A soft round hole: clear in the middle, fading to nothing at its rim. Cut out of the mist. */
const HOLE_KEY = "fog-hole";
const HOLE_SIZE = 64;
/** Ms for the fog to roll in or lift as the sky turns. */
const FADE_MS = 8000;
/** How far past the view the mist reaches, px, so it never shows an edge as the camera moves. */
const VIEW_MARGIN = 64;
/** The blanket is drawn at this fraction of screen size and scaled up: it's soft, so it costs a quarter. */
const BLANKET_RES = 0.5;

interface Fog {
  /** The mist pattern, drawn into `layer` (never shown itself). */
  pattern: Phaser.GameObjects.TileSprite;
  /** The mist as shown: the pattern, with holes cut where bodies stand and have passed. */
  layer: Phaser.GameObjects.RenderTexture;
}

let fog: Fog | undefined;
/** How thick the fog is now, 0 to 1, eased toward the sky's. */
let thickness = 0;
let shownMap: string | undefined;
let followedFrame = -1;
/** The last frame's length, ms, for easing the puffs. */
let frameDelta = 16;

function createTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists(MIST_KEY)) {
    const texture = scene.textures.createCanvas(
      MIST_KEY,
      MIST_SIZE,
      MIST_SIZE,
    ) as Phaser.Textures.CanvasTexture;
    const pixels = texture.getContext().createImageData(MIST_SIZE, MIST_SIZE);
    pixels.data.set(drawFogArt(MIST_SIZE, 3));
    texture.getContext().putImageData(pixels, 0, 0);
    /* Smooth when scaled up: mist is soft, not pixel art */
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    texture.refresh();
  }
  if (!scene.textures.exists(HOLE_KEY)) {
    const texture = scene.textures.createCanvas(
      HOLE_KEY,
      HOLE_SIZE,
      HOLE_SIZE,
    ) as Phaser.Textures.CanvasTexture;
    const context = texture.getContext();
    const middle = HOLE_SIZE / 2;
    const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, HOLE_SIZE, HOLE_SIZE);
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    texture.refresh();
  }
}

function fogOf(scene: SceneMain): Fog {
  if (fog && fog.layer.scene === scene) return fog;
  createTextures(scene);
  const pattern = scene.make
    .tileSprite({ x: 0, y: 0, width: 1, height: 1, key: MIST_KEY }, false)
    .setOrigin(0, 0)
    .setTileScale(MIST_SCALE * BLANKET_RES);
  const layer = scene.add.renderTexture(0, 0, 1, 1).setOrigin(0, 0).setDepth(GROUND_FOG_DEPTH);
  scene.minimap?.ignore(layer);
  fog = { pattern, layer };
  const camera = scene.cameras.main;
  const onFollow = () => {
    followedFrame = scene.game.loop.frame;
    drawFog(scene);
  };
  camera.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, onFollow);
  scene.events.once("shutdown", () => {
    camera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, onFollow);
    pattern.destroy();
    fog = undefined;
    shownMap = undefined;
  });
  return fog;
}

/**
 * Rolls a ground mist in and lifts it with the sky over outdoor maps. It lies under everyone and
 * everything standing in it, drifting on the wind (fixed in the world, so every player sees the
 * same mist), and it parts round each body's feet and swirls in behind anything walking through it.
 */
export function updateFog(scene: SceneMain, delta: number) {
  fogOf(scene);
  const map = getMapByName(scene.roomName);
  const target = map?.isOutdoors && currentSky() === "foggy" ? 1 : 0;
  /* A new map opens in the fog it has, already there */
  if (shownMap !== scene.roomName) {
    shownMap = scene.roomName;
    thickness = target;
    clearSwirls();
    clearPuffKicks();
  }
  frameDelta = delta;
  const step = delta / FADE_MS;
  thickness += Phaser.Math.Clamp(target - thickness, -step, step);
  if (thickness > 0) leaveSwirls(bodiesInView(scene), scene.time.now);
  if (followedFrame >= scene.game.loop.frame - 1) return;
  drawFog(scene);
}

/** The bodies near enough to the view to touch the mist on screen: the rest are skipped. */
function bodiesInView(scene: SceneMain) {
  const view = scene.cameras.main.worldView;
  const reach = VIEW_MARGIN * 2;
  return [...getPlayers(scene), ...getNpcs(scene)].filter(
    (body) =>
      body.x > view.x - reach &&
      body.x < view.right + reach &&
      body.y > view.y - reach &&
      body.y < view.bottom + reach,
  );
}

function drawFog(scene: SceneMain) {
  if (!fog) return;
  const map = getMapByName(scene.roomName);
  const shown = map?.isOutdoors ? thickness : 0;
  const { pattern, layer } = fog;
  layer.setVisible(shown > 0);
  if (shown <= 0) {
    drawPuffs(scene, {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      drift: { x: 0, y: 0 },
      time: 0,
      thickness: 0,
      bodies: [],
      delta: frameDelta,
    });
    return;
  }

  const view = scene.cameras.main.worldView;
  const left = Math.floor(view.x) - VIEW_MARGIN;
  const top = Math.floor(view.y) - VIEW_MARGIN;
  const width = Math.ceil(view.width) + VIEW_MARGIN * 2;
  const height = Math.ceil(view.height) + VIEW_MARGIN * 2;
  const smallWidth = Math.ceil(width * BLANKET_RES);
  const smallHeight = Math.ceil(height * BLANKET_RES);
  if (layer.width !== smallWidth || layer.height !== smallHeight) {
    layer.resize(smallWidth, smallHeight);
  }
  if (pattern.width !== smallWidth || pattern.height !== smallHeight) {
    pattern.setSize(smallWidth, smallHeight);
  }
  layer
    .setPosition(left, top)
    .setScale(1 / BLANKET_RES)
    .setAlpha(MIST_ALPHA * shown);

  /* The mist, fixed in the world and carried by the wind */
  const drift = driftAt(worldNow());
  pattern.setTilePosition(
    Math.round((left - drift.x * MIST_SPEED) / MIST_SCALE),
    Math.round((top - drift.y * MIST_SPEED) / MIST_SCALE),
  );
  layer.clear();
  layer.draw(pattern, 0, 0);

  /* Holes where bodies stand, and swirling in behind where they've walked */
  const cut = (x: number, y: number, radius: number, alpha: number) =>
    layer.stamp(HOLE_KEY, undefined, (x - left) * BLANKET_RES, (y - top) * BLANKET_RES, {
      scale: ((radius * 2) / HOLE_SIZE) * BLANKET_RES,
      alpha,
      blendMode: Phaser.BlendModes.ERASE,
    });
  const bodies = bodiesInView(scene);
  for (const feet of feetOf(bodies)) cut(feet.x, feet.y, feet.radius, 0.7);
  for (const swirl of swirlsAt(scene.time.now)) cut(swirl.x, swirl.y, swirl.radius, swirl.clear);
  layer.render();

  /* The puffs over it, which bodies walk in and stir up */
  drawPuffs(scene, {
    left,
    top,
    width,
    height,
    drift: { x: drift.x * MIST_SPEED, y: drift.y * MIST_SPEED },
    time: worldNow() / 1000,
    thickness: shown,
    bodies,
    delta: frameDelta,
  });
}
