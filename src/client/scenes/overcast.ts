import Phaser from "phaser";
import { getMapByName } from "@/content";
import { lightningAt } from "@/rules/weather";
import { playThunder } from "@/client/audio/thunder";
import { skyOver } from "./clouds";
import { stormStrength } from "./storm-strength";
import type { SceneMain } from "./main-scene";
import { worldNow } from "./world-clock";
import { LIGHTNING_DEPTH, OVERCAST_DEPTH } from "./world-depths";

/** How dark the overcast is in showers and in a storm. */
const DARKNESS = { showers: 0.12, storm: 0.24 };
const OVERCAST_COLOR = 0x1c2230;
/** How bright the lightning's flash is at its peak. */
const FLASH_ALPHA = 0.4;
const FLASH_COLOR = 0xe8f0ff;
/** Ms for the overcast to gather or lift as the sky turns. */
const FADE_MS = 6000;

let layers:
  | { overcast: Phaser.GameObjects.Rectangle; flash: Phaser.GameObjects.Rectangle }
  | undefined;
/** How dark the overcast is now, eased toward the sky's. */
let darkness = 0;
/** The lightning's brightness last frame, so a new flash is caught as it strikes. */
let lastBrightness = 0;
/** When thunder last rolled, so a double flicker rolls it once. */
let lastThunderAt = -Infinity;
/** Ms after one roll of thunder before a strike rolls another. */
const THUNDER_GAP_MS = 1500;

/** The map shown last frame, so a new one opens under the sky it has rather than fading it in. */
let shownMap: string | undefined;

/** A screen-sized rectangle: pinned to the screen, covering it at the camera's zoom. */
function screenRect(scene: SceneMain, color: number, depth: number) {
  const rect = scene.add.rectangle(0, 0, 1, 1, color).setScrollFactor(0).setDepth(depth);
  rect.setVisible(false);
  scene.minimap?.ignore(rect);
  return rect;
}

function layersOf(scene: SceneMain) {
  if (layers?.overcast.scene === scene) return layers;
  layers = {
    overcast: screenRect(scene, OVERCAST_COLOR, OVERCAST_DEPTH),
    flash: screenRect(scene, FLASH_COLOR, LIGHTNING_DEPTH).setBlendMode(Phaser.BlendModes.ADD),
  };
  scene.events.once("shutdown", () => {
    layers = undefined;
    shownMap = undefined;
  });
  return layers;
}

function cover(scene: SceneMain, rect: Phaser.GameObjects.Rectangle) {
  const camera = scene.cameras.main;
  const width = Math.ceil(camera.width / camera.zoom) + 2;
  const height = Math.ceil(camera.height / camera.zoom) + 2;
  rect.setPosition(camera.width / 2, camera.height / 2).setSize(width, height);
}

/**
 * Darkens outdoor maps evenly through showers and storms, more in a storm, and flashes a storm's
 * lightning over them, the same moment for every player (see `lightningAt`), and rolls its thunder.
 */
export function updateOvercast(scene: SceneMain, delta: number) {
  const { overcast, flash } = layersOf(scene);
  const map = getMapByName(scene.roomName);
  const sky = map?.isOutdoors ? skyOver(scene).sky : undefined;
  const targetDarkness = sky === "showers" || sky === "storm" ? DARKNESS[sky] : 0;
  if (shownMap !== scene.roomName) {
    shownMap = scene.roomName;
    darkness = targetDarkness;
  }
  const step = delta / FADE_MS;
  darkness += Phaser.Math.Clamp(
    targetDarkness - darkness,
    -step * DARKNESS.storm,
    step * DARKNESS.storm,
  );

  overcast.setVisible(darkness > 0);
  if (darkness > 0) {
    cover(scene, overcast);
    overcast.setAlpha(darkness);
  }
  const storminess = stormStrength();
  const now = worldNow();
  const strike = storminess > 0 ? lightningAt(now) : 0;
  const brightness = strike * storminess;
  /* Thunder for each strike as it flashes, unless the storm is only just gathering */
  if (
    strike >= 1 &&
    lastBrightness < 1 &&
    storminess > 0.5 &&
    now - lastThunderAt > THUNDER_GAP_MS
  ) {
    lastThunderAt = now;
    playThunder(scene, Math.random());
  }
  lastBrightness = strike;
  flash.setVisible(brightness > 0);
  if (brightness > 0) {
    cover(scene, flash);
    flash.setAlpha(brightness * FLASH_ALPHA);
  }
}
