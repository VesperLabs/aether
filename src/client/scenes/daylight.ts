import Phaser from "phaser";
import { getMapByName } from "@/content";
import { CAVE_LIGHT, skyLightAt } from "@/client/views/sky-light";
import type { SceneMain } from "./main-scene";
import { currentHour } from "./world-clock";
import { DAYLIGHT_DEPTH } from "./world-depths";
import { createLightTextures } from "@/client/views/lights";
import { drawLights } from "./light-layers";

/**
 * How far past the camera's view the light map reaches, in world pixels: a safety margin, so a
 * frame where it trails the camera (a pan, the login tour) never shows the world past its edge.
 */
const VIEW_MARGIN = 64;
const VIGNETTE_KEY = "daylight-vignette";
/** The gradient is drawn at this size, then stretched to fit the camera's view (see `vignetteScale`). */
const VIGNETTE_TEXTURE_SIZE = 1024;
/** Where the dark starts and where it is full, as fractions of the vignette's radius. */
const VIGNETTE_CLEAR = 0.04;
const VIGNETTE_DARK = 0.17;
/** The color the vignette darkens to. */
const VIGNETTE_COLOR = 0x05060f;

/**
 * What draws the sky's light over the world. `lightMap` is how lit each spot is: the sky's tint,
 * darker towards the edges (the vignette), brighter around lights. It is multiplied over the
 * world, so white leaves it as drawn.
 */
interface Daylight {
  lightMap: Phaser.GameObjects.RenderTexture;
  /** Drawn at half strength and multiplied in twice over (see `multiplyTwice`). */
  isDoubled: boolean;
  colors: Phaser.Filters.ColorMatrix;
  /** The minimap's night: the sky's tint and colors over all of it, lighter so it stays readable. */
  minimapColors?: Phaser.Filters.ColorMatrix;
}

let daylight: Daylight | undefined;
/** The last frame the camera followed the hero, and so drew the daylight itself. */
let followedFrame = -1;

/**
 * The clear middle of the vignette: solid in the centre, fading out to nothing. It is stamped on
 * a map already dark everywhere, so however the camera sits there is never an edge to see.
 */
function createVignetteTexture(scene: SceneMain) {
  if (scene.textures.exists(VIGNETTE_KEY)) return;
  const size = VIGNETTE_TEXTURE_SIZE;
  const texture = scene.textures.createCanvas(
    VIGNETTE_KEY,
    size,
    size,
  ) as Phaser.Textures.CanvasTexture;
  const context = texture.getContext();
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(VIGNETTE_CLEAR, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(VIGNETTE_DARK, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.refresh();
  /* The game draws pixel art sharp; a stretched gradient must stay smooth */
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/**
 * The light map is drawn at half strength and multiplied in twice over (`multiplyTwice`): mid gray
 * is daylight, darker dims the world, lighter brightens it. A light so makes what it touches
 * brighter and richer than by day, in proportion to its own colors: outlines and shading stay
 * dark, nothing washes out the way light added on top would. Without WebGL (no custom blends) it
 * is drawn at full strength and plainly multiplied: lights then only undo the dark.
 */
const half = (color: number) => (color >> 1) & 0x7f7f7f;

/**
 * How much of a light goes into a half-strength light map: 0.5 brings a spot back to daylight,
 * more makes it brighter than day.
 */
const LIGHT_STRENGTH = 0.62;

let multiplyTwiceMode: number | undefined;

/** A blend that multiplies the world by twice the light map (`src * dst + dst * src`), or none. */
function multiplyTwice(scene: SceneMain): number | undefined {
  if (scene.renderer.type !== Phaser.WEBGL) return undefined;
  if (multiplyTwiceMode === undefined) {
    const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    const { gl } = renderer;
    renderer.addBlendMode([gl.DST_COLOR, gl.SRC_COLOR], gl.FUNC_ADD);
    /* Phaser 4.2.1's addBlendMode returns one less than the mode's index (a normal blend): the new
    mode is the last one */
    multiplyTwiceMode = renderer.blendModes.length - 1;
  }
  return multiplyTwiceMode;
}

/** `from` blended `t` of the way to `to`, channel by channel. */
const mixColor = (from: number, to: number, t: number) =>
  [16, 8, 0].reduce((color, shift) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return color | (Math.round(a + (b - a) * t) << shift);
  }, 0);

/** How much to stretch the vignette so it looks the same at any zoom: full dark before the corners. */
function vignetteScale(view: Phaser.Geom.Rectangle) {
  const halfDiagonal = Math.hypot(view.width, view.height) / 2;
  /* Full dark at 60% of the way from the middle to a corner */
  return (2 * 0.6 * halfDiagonal) / VIGNETTE_DARK / VIGNETTE_TEXTURE_SIZE;
}

/**
 * The sky's light over the world: a light map multiplied in to dim it (with lights cutting through),
 * and a camera filter for how rich its colors are. Not drawn on the minimap.
 */
export function createDaylight(scene: SceneMain) {
  createVignetteTexture(scene);
  createLightTextures(scene);
  const doubled = multiplyTwice(scene);
  const lightMap = scene.add
    .renderTexture(0, 0, 1, 1)
    .setOrigin(0, 0)
    .setDepth(DAYLIGHT_DEPTH)
    .setBlendMode(doubled ?? Phaser.BlendModes.MULTIPLY);
  scene.minimap?.ignore(lightMap);
  daylight = {
    lightMap,
    isDoubled: doubled !== undefined,
    colors: scene.cameras.main.filters.external.addColorMatrix(),
    minimapColors: scene.minimap?.filters.external.addColorMatrix(),
  };
  /* Drawn once the camera has followed the hero for the frame, so it never trails the view */
  const camera = scene.cameras.main;
  const onFollow = () => {
    followedFrame = scene.game.loop.frame;
    drawDaylight(scene);
  };
  camera.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, onFollow);
  scene.events.once("shutdown", () => {
    camera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, onFollow);
    daylight = undefined;
  });
}

/** Redraws the light map over the camera's view: the sky's tint, the vignette, then every light. */
function drawLightMap(
  scene: SceneMain,
  { lightMap, isDoubled }: Pick<Daylight, "lightMap" | "isDoubled">,
  tint: number,
  vignette: number,
) {
  const view = scene.cameras.main.worldView;
  const width = Math.ceil(view.width) + 2 * VIEW_MARGIN;
  const height = Math.ceil(view.height) + 2 * VIEW_MARGIN;
  if (lightMap.width !== width || lightMap.height !== height) lightMap.resize(width, height);
  /* Whole pixels, so the map doesn't shimmer against the world as the camera moves */
  const left = Math.floor(view.x) - VIEW_MARGIN;
  const top = Math.floor(view.y) - VIEW_MARGIN;
  lightMap.setPosition(left, top);

  /* Dark everywhere as the vignette's edge, then the sky's tint in a clear spot on the hero (or the
  middle of the screen while there is none: the login tour) */
  const scaled = isDoubled ? half : (color: number) => color;
  lightMap.clear().fill(scaled(mixColor(tint, VIGNETTE_COLOR, vignette)));
  const center = scene.hero ?? scene.cameras.main.midPoint;
  if (vignette > 0) {
    lightMap.stamp(VIGNETTE_KEY, undefined, center.x - left, center.y - top, {
      tint: scaled(tint),
      scale: vignetteScale(view),
    });
  }
  /* The lights, each cut by what stands over it: see `drawLights` */
  drawLights(scene, lightMap, { left, top, width, height }, isDoubled ? LIGHT_STRENGTH : 1);
  lightMap.render();
}

/**
 * Lights the world for the hour, each frame, while the camera isn't following the hero (the login
 * tour, a pan); while it is, the camera's follow draws it instead, after it has moved.
 */
export function updateDaylight(scene: SceneMain) {
  /* Scene updates come before the camera moves: last frame's follow means it is still following */
  if (followedFrame >= scene.game.loop.frame - 1) return;
  drawDaylight(scene);
}

/** Lights the world for the hour; maps indoors stay as they are. */
function drawDaylight(scene: SceneMain) {
  if (!daylight) return;
  const { lightMap, colors, minimapColors } = daylight;
  const map = getMapByName(scene.roomName);
  /* Outdoors the sky's light for the hour; caves their own, always; other indoor maps none */
  const light = map?.isOutdoors ? skyLightAt(currentHour()) : map?.isCave ? CAVE_LIGHT : undefined;
  lightMap.setVisible(Boolean(light));
  colors.active = Boolean(light);
  if (minimapColors) minimapColors.active = Boolean(map?.isOutdoors);
  if (!light) return;

  drawLightMap(scene, daylight, light.tint, light.vignette);
  colors.colorMatrix.saturate(light.saturation);
  if (minimapColors && map?.isOutdoors) tintMinimap(minimapColors, light.tint, light.saturation);
}

/** How far the minimap's tint goes back towards white, so it is dimmer at night but readable. */
const MINIMAP_TINT_LIFT = 0.35;

/** Colors the whole minimap like the sky: its saturation, then its tint, channel by channel. */
function tintMinimap(filter: Phaser.Filters.ColorMatrix, tint: number, saturation: number) {
  const lifted = mixColor(tint, 0xffffff, MINIMAP_TINT_LIFT);
  const [r, g, b] = [16, 8, 0].map((shift) => ((lifted >> shift) & 0xff) / 255);
  filter.colorMatrix.saturate(saturation);
  filter.colorMatrix.multiply([r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0], true);
}
