import Phaser from "phaser";
import type { Player } from "./player";

const VORTEX_COLOR = 0xffffff;
const VORTEX_ALPHA = 0.35;
const VORTEX_RADIUS = 10;
/** How far ahead of the body's center the vortex sits, along the lunge. */
const VORTEX_AHEAD = 14;
/** Squashed along the lunge, so the ring reads as a disc the body is driving through. */
const VORTEX_DEPTH_SCALE = 0.4;
/** Turns per second of the swirl. */
const VORTEX_SPIN = 3;
const VORTEX_ARMS = 3;
const VORTEX_FADE_MS = 120;

const vortices = new WeakMap<Player, Phaser.GameObjects.Container>();

/** While a lunge lasts: a translucent spinning vortex in front of the player, faded out after. */
export function updateVortex(p: Player, isLunging: boolean, now: number) {
  let vortex = vortices.get(p);
  if (!isLunging) {
    if (vortex) fadeOut(p, vortex);
    return;
  }
  if (!vortex?.active) {
    vortex = createVortex(p);
    vortices.set(p, vortex);
  }
  const angle = p.state.lungeAngle ?? 0;
  vortex.setPosition(
    p.x + Math.cos(angle) * VORTEX_AHEAD,
    p.y + p.bodyOffsetY + Math.sin(angle) * VORTEX_AHEAD,
  );
  vortex.setRotation(angle);
  vortex.setDepth(p.depth + 1);
  const swirl = vortex.list[0] as Phaser.GameObjects.Graphics;
  swirl.setRotation(((now / 1000) * VORTEX_SPIN * Math.PI * 2) % (Math.PI * 2));
}

function createVortex(p: Player) {
  const swirl = p.scene.add.graphics();
  for (let arm = 0; arm < VORTEX_ARMS; arm++) {
    const start = (arm / VORTEX_ARMS) * Math.PI * 2;
    swirl.lineStyle(2, VORTEX_COLOR, VORTEX_ALPHA);
    swirl.beginPath();
    swirl.arc(0, 0, VORTEX_RADIUS, start, start + Math.PI / 2);
    swirl.strokePath();
    swirl.lineStyle(1, VORTEX_COLOR, VORTEX_ALPHA * 0.6);
    swirl.beginPath();
    swirl.arc(0, 0, VORTEX_RADIUS * 0.55, start + Math.PI / 3, start + Math.PI);
    swirl.strokePath();
  }
  const vortex = p.scene.add.container(p.x, p.y, [swirl]);
  /* Spin the swirl inside; squash the container so the disc faces the way the lunge goes */
  vortex.setScale(VORTEX_DEPTH_SCALE, 1);
  vortex.setAlpha(p.alpha);
  return vortex;
}

function fadeOut(p: Player, vortex: Phaser.GameObjects.Container) {
  vortices.delete(p);
  p.scene.tweens.add({
    targets: vortex,
    alpha: 0,
    duration: VORTEX_FADE_MS,
    onComplete: () => vortex.destroy(),
  });
}
