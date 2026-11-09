import Phaser from "phaser";
import type { Player } from "./player";

/** Particle counts (poison bubbles, blood drops) are set for a human body. */
const HUMAN_BODY_HEIGHT = 46;
/** Other bodies get more or fewer by height, within these limits. */
const MIN_COUNT_SCALE = 0.4;
const MAX_COUNT_SCALE = 1.6;
/** Particles come off a column this wide at most, so a big body doesn't scatter them. */
const MAX_SPREAD = 20;

/** `count` for a human, more for a taller body, fewer (at least one) for a shorter one. */
export function scaledCount(player: Player, count: number) {
  const height = player.hitBoxSize?.height ?? HUMAN_BODY_HEIGHT;
  const scale = Phaser.Math.Clamp(height / HUMAN_BODY_HEIGHT, MIN_COUNT_SCALE, MAX_COUNT_SCALE);
  return Math.max(1, Math.round(count * scale));
}

/** How wide a column particles come off the body from. */
export function particleSpread(player: Player) {
  return Math.min(MAX_SPREAD, player.hitBoxSize?.width ?? 16);
}
