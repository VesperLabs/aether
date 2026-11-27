import Phaser from "phaser";
import { getMapByName } from "@/content";
import { skyOver } from "./clouds";
import type { SceneMain } from "./main-scene";

/** Ms for showers to build into a storm, or a storm to ease back into showers. */
const FADE_MS = 6000;

/** How stormy it is now, 0 (showers or calmer) to 1 (a full storm), eased toward the sky's. */
let strength = 0;
/** The map shown last frame, so a new one opens under the sky it has rather than easing in. */
let shownMap: string | undefined;

/**
 * Eases the storm in and out, so everything a storm makes stronger (rain, splashes, the overcast,
 * lightning) grows and fades together instead of stepping when the sky turns. Runs before them.
 */
export function updateStormStrength(scene: SceneMain, delta: number) {
  const map = getMapByName(scene.roomName);
  const target = map?.isOutdoors && skyOver(scene).sky === "storm" ? 1 : 0;
  if (shownMap !== scene.roomName) {
    shownMap = scene.roomName;
    strength = target;
    return;
  }
  strength += Phaser.Math.Clamp(target - strength, -delta / FADE_MS, delta / FADE_MS);
}

/** How stormy it is now, 0 to 1 (see `updateStormStrength`). */
export const stormStrength = () => strength;
