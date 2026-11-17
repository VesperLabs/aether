import Phaser from "phaser";
import { getBody } from "@/content";
import type { Player } from "./player";

/** Particle counts (poison bubbles, blood drops) are set for a human body: its file's height. */
const HUMAN_BODY_HEIGHT = getBody("human").hitBox.height;
/** Other bodies get more or fewer by height, within these limits. */
const MIN_COUNT_SCALE = 0.4;
const MAX_COUNT_SCALE = 1.6;
/** Particles come off a column this wide at most, so a big body doesn't scatter them. */
const MAX_SPREAD = 20;

/** `count` for a human, more for a taller body, fewer (at least one) for a shorter one. */
export function scaledCount(player: Player, count: number) {
  const height = player.hitBoxSize.height;
  const scale = Phaser.Math.Clamp(height / HUMAN_BODY_HEIGHT, MIN_COUNT_SCALE, MAX_COUNT_SCALE);
  return Math.max(1, Math.round(count * scale));
}

/** How wide a column particles come off the body from. */
export function particleSpread(player: Player) {
  return Math.min(MAX_SPREAD, player.hitBoxSize.width);
}
