import Phaser from "phaser";
import { getMapByName } from "@/content";
import { mapSeason } from "@/rules/seasons";
import { CLOUD_SHAPES, cloudsOver, skyIn, type LocalSky, type Weather } from "@/rules/weather";
import { cloudRoll, drawCloudArt } from "./cloud-art";
import type { SceneMain } from "./main-scene";
import { worldNow } from "./world-clock";
import { CLOUD_DEPTH } from "./world-depths";

/** How dark the clouds' shadow is while the sky is cloudy. */
const CLOUDY_ALPHA = 0.14;
/** Cloud shapes are drawn once at the map's own pixel size: each between these widths, px. */
const WIDTH_MIN = 360;
const WIDTH_MAX = 720;
/** How tall a cloud is for its width, between these: some round heaps, some long, flat banks. */
const HEIGHT_SHARE_MIN = 0.36;
const HEIGHT_SHARE_MAX = 0.55;
/** Ms for the clouds to fade in or out as the sky turns. */
const FADE_MS = 6000;
/** How far past the view clouds are drawn, px: half the widest cloud, so none pops in at the edge. */
const VIEW_MARGIN = WIDTH_MAX / 2;

let weather: Weather = { sky: "clear", windAngle: 0, windSpeed: 0 };
/** Every cloud drawn solid into this one layer, which is then made see-through as a whole. */
let layer: Phaser.GameObjects.RenderTexture | undefined;
/** The clouds' darkness now, eased toward the sky's, so a turn in the weather comes on gently. */
let shownAlpha = 0;
/** The map shown last frame, so a new one opens under the sky it has rather than fading it in. */
let shownMap: string | undefined;
/** The last frame the camera followed the hero, and so drew the clouds itself. */
let followedFrame = -1;

/** The weather the server last sent. */
export function setWeather(next: Weather) {
  weather = next;
}

/** The wind the server last sent: which way, radians, and how fast, px/s. */
export const currentWind = () => ({ angle: weather.windAngle, speed: weather.windSpeed });

/** The sky over the scene's map: the world's, as its season allows (showers and storms snow only in winter). */
export function skyOver(scene: SceneMain): LocalSky {
  return skyIn(weather.sky, mapSeason(getMapByName(scene.roomName)?.seasons, scene.season));
}

const keyOf = (shape: number) => `cloud-shape-${shape}`;

function sizeOf(shape: number) {
  /* Weighted toward the big end: mostly large clouds, the odd smaller one */
  const big = Math.sqrt(cloudRoll(shape, 9, 5));
  const width = Math.round(WIDTH_MIN + big * (WIDTH_MAX - WIDTH_MIN));
  const share = HEIGHT_SHARE_MIN + cloudRoll(shape, 8, 5) * (HEIGHT_SHARE_MAX - HEIGHT_SHARE_MIN);
  return { width, height: Math.round(width * share) };
}

function createCloudTextures(scene: Phaser.Scene) {
  for (let shape = 0; shape < CLOUD_SHAPES; shape++) {
    const key = keyOf(shape);
    if (scene.textures.exists(key)) continue;
    const { width, height } = sizeOf(shape);
    const texture = scene.textures.createCanvas(
      key,
      width,
      height,
    ) as Phaser.Textures.CanvasTexture;
    const art = drawCloudArt(shape, width, height);
    const pixels = texture.getContext().createImageData(width, height);
    pixels.data.set(art.data);
    texture.getContext().putImageData(pixels, 0, 0);
    texture.refresh();
  }
}

function layerOf(scene: SceneMain) {
  if (layer?.scene === scene) return layer;
  layer = scene.add.renderTexture(0, 0, 1, 1).setOrigin(0, 0).setDepth(CLOUD_DEPTH);
  scene.minimap?.ignore(layer);
  /* Drawn once the camera has followed the hero for the frame, so they never trail the view */
  const camera = scene.cameras.main;
  const onFollow = () => {
    followedFrame = scene.game.loop.frame;
    drawClouds(scene);
  };
  camera.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, onFollow);
  scene.events.once("shutdown", () => {
    camera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, onFollow);
    layer = undefined;
    shownMap = undefined;
  });
  return layer;
}

/**
 * Fades the clouds' shadows in and out with the sky over outdoor maps, and draws them where the
 * camera is. Where they are comes from the world's time alone (see `cloudsOver`), so every player
 * sees the same clouds in the same places, and stepping out of a house finds them where the wind
 * took them.
 */
export function updateClouds(scene: SceneMain, delta: number) {
  layerOf(scene);
  const map = getMapByName(scene.roomName);
  if (!map?.isOutdoors) {
    shownMap = undefined;
    layer?.setVisible(false);
    return;
  }
  /* Only a cloudy sky has drifting clouds; showers and storms are an even overcast (see `overcast`) */
  const alpha = skyOver(scene).sky === "cloudy" ? CLOUDY_ALPHA : 0;
  /* A new map opens under the sky it has, already there */
  if (shownMap !== scene.roomName) {
    shownMap = scene.roomName;
    shownAlpha = alpha;
  }
  const step = (delta / FADE_MS) * CLOUDY_ALPHA;
  shownAlpha += Phaser.Math.Clamp(alpha - shownAlpha, -step, step);
  /* Scene updates come before the camera moves: last frame's follow means it is still following */
  if (followedFrame >= scene.game.loop.frame - 1) return;
  drawClouds(scene);
}

/**
 * Draws the clouds over the camera's view, solid into one layer that is then made see-through, so
 * where clouds cross the shadow stays one even shade.
 */
function drawClouds(scene: SceneMain) {
  const target = layer;
  if (!target) return;
  const map = getMapByName(scene.roomName);
  const shown = map?.isOutdoors ? shownAlpha : 0;
  target.setVisible(shown > 0);
  if (shown <= 0) return;

  createCloudTextures(scene);
  const view = scene.cameras.main.worldView;
  const left = Math.floor(view.x) - VIEW_MARGIN;
  const top = Math.floor(view.y) - VIEW_MARGIN;
  const width = Math.ceil(view.width) + VIEW_MARGIN * 2;
  const height = Math.ceil(view.height) + VIEW_MARGIN * 2;
  if (target.width !== width || target.height !== height) target.resize(width, height);
  target.setPosition(left, top).setAlpha(shown);
  target.clear();
  const area = { left, top, right: left + width, bottom: top + height };
  for (const cloud of cloudsOver(scene.roomName, worldNow(), area)) {
    target.stamp(
      keyOf(cloud.shape),
      undefined,
      Math.round(cloud.x - left),
      Math.round(cloud.y - top),
      {
        scaleX: cloud.flip ? -1 : 1,
      },
    );
  }
  target.render();
}
