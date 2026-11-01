import Phaser from "phaser";
import type { Player } from "./player";

/** One puff this often while lunging. */
const PUFF_EVERY_MS = 30;
const PUFF_COLOR = 0xd8d0c0;
const PUFF_ALPHA = 0.5;
const PUFF_RADIUS = 3;
/** Each puff swells to this many times its size as it rises and fades. */
const PUFF_GROWTH = 2.2;
/** How far a puff rises before it is gone, in pixels. */
const PUFF_RISE = 10;
const PUFF_FADE_MS = 450;
/** Puffs scatter this far around the feet, so the trail reads as dust, not a line. */
const PUFF_SPREAD = 4;

const lastPuff = new WeakMap<Player, number>();

/** While a lunge lasts: kick up dust at the player's feet that rises and fades behind them. */
export function trailDust(p: Player, now: number) {
  if (now - (lastPuff.get(p) ?? 0) < PUFF_EVERY_MS) return;
  lastPuff.set(p, now);
  leavePuff(p);
}

function leavePuff(p: Player) {
  const { scene } = p;
  const x = p.x + Phaser.Math.FloatBetween(-PUFF_SPREAD, PUFF_SPREAD);
  /* The player's position is at its feet */
  const y = p.y + Phaser.Math.FloatBetween(-PUFF_SPREAD, PUFF_SPREAD) / 2;
  const puff = scene.add.circle(x, y, PUFF_RADIUS, PUFF_COLOR, PUFF_ALPHA * p.alpha);
  puff.setDepth(p.depth - 1);
  scene.tweens.add({
    targets: puff,
    y: y - PUFF_RISE,
    scale: PUFF_GROWTH,
    alpha: 0,
    duration: PUFF_FADE_MS,
    ease: "Quad.easeOut",
    onComplete: () => puff.destroy(),
  });
}
