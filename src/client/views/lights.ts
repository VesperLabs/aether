import Phaser from "phaser";
import type { Point } from "@/rules/world";

/** Something that gives off light at night: where it is, how far it reaches, and its color. */
export interface Light {
  /** Where the light is now, in the world, or nothing while it's dark (hidden, off-screen). */
  position: () => Point | undefined;
  /** How far the light reaches, in world pixels. */
  radius: number;
  color: number;
  /** 0 to 1. */
  intensity?: number;
  /** How many times longer than wide it is (a blade's glow), along `angle`. Default 1, round. */
  stretch?: number;
  /** Which way the stretch runs, in radians. */
  angle?: number;
  /**
   * The map's layers drawn over the light, which it doesn't light: by default `Above` (tree tops,
   * roofs), so a fire under the leaves leaves them dark. A lantern up among the roofs has none; a
   * window has `Extras`, so a tree standing in front of it stays dark but the eaves over it don't
   * cut its glow off.
   */
  blockedBy?: readonly string[];
  /** A falloff texture with its own colors (`FIRE_LIGHT_KEY`), drawn untinted. Default the plain one. */
  texture?: string;
}

const lights = new Set<Light>();

/** Lights the world with `light` until the returned function is called. */
export function addLight(light: Light): () => void {
  lights.add(light);
  return () => lights.delete(light);
}

/** Every light, for the light map (see `daylight`). */
export const allLights = (): Iterable<Light> => lights;

export const LIGHT_KEY = "light-falloff";
/** A fire's whole light in one: a hot core easing through orange to a deep red edge. */
export const FIRE_LIGHT_KEY = "light-fire";
/** Falloffs are drawn at this size; a light's radius scales them. */
export const LIGHT_TEXTURE_SIZE = 128;

const FALLOFF_STOPS = 24;

/** A bell curve that eases to nothing at the edge: no knee or rim, so overlapping lights blend. */
const bell = (t: number) => Math.exp(-3 * t * t) * (1 - t * t);

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** Fire's color from the middle (`t` 0) out: pale gold, orange, then deep red as it fades. */
const fireColor = (t: number): [number, number, number] =>
  t < 0.35
    ? [255, mix(214, 150, t / 0.35), mix(140, 70, t / 0.35)]
    : [
        mix(255, 220, (t - 0.35) / 0.65),
        mix(150, 70, (t - 0.35) / 0.65),
        mix(70, 30, (t - 0.35) / 0.65),
      ];

/** Draws a radial falloff, `colorAt` from the middle (0) to the edge (1), as a texture. */
function createFalloff(
  scene: Phaser.Scene,
  key: string,
  colorAt: (t: number) => [number, number, number, number],
) {
  if (scene.textures.exists(key)) return;
  const size = LIGHT_TEXTURE_SIZE;
  const texture = scene.textures.createCanvas(key, size, size) as Phaser.Textures.CanvasTexture;
  const context = texture.getContext();
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  for (let i = 0; i <= FALLOFF_STOPS; i++) {
    const t = i / FALLOFF_STOPS;
    const [r, g, b, a] = colorAt(t);
    gradient.addColorStop(
      t,
      `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`,
    );
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** The falloffs lights are stamped with: plain white (tinted per light), and fire's own colors. */
export function createLightTextures(scene: Phaser.Scene) {
  createFalloff(scene, LIGHT_KEY, (t) => [255, 255, 255, bell(t)]);
  /* Wider than the plain bell, so the warm edge carries further before it goes */
  createFalloff(scene, FIRE_LIGHT_KEY, (t) => [
    ...fireColor(t),
    Math.exp(-2 * t * t) * (1 - t * t),
  ]);
}
