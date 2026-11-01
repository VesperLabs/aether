import Phaser from "phaser";
import { LUNGE_HIT_LEAD } from "@/rules/movement";
import type { Player } from "./player";

const DOME_COLOR = 0xffffff;
/** Alpha at the dome's leading edge; it fades to nothing toward the back. */
const DOME_ALPHA = 0.3;
const DOME_RADIUS = 22;
/** How far ahead of the body's center the dome's flat back sits, along the lunge. */
const DOME_AHEAD = LUNGE_HIT_LEAD - 8;
/** Squashed along the lunge, so the half sphere reads as a shallow cap pushed through the air. */
const DOME_DEPTH_SCALE = 0.85;
/** Vertical slices the fade is drawn in, back to front. */
const DOME_SLICES = 32;
const DOME_FADE_MS = 80;

const domes = new WeakMap<Player, Phaser.GameObjects.Graphics>();
const fading = new WeakSet<Phaser.GameObjects.Graphics>();

/** While a lunge lasts: a translucent half sphere in front of the player, faded out after. */
export function updateVortex(p: Player, isLunging: boolean) {
  let dome = domes.get(p);
  if (!isLunging) {
    if (!dome) return;
    /* Keeps following the player while it fades, so it never lingers behind as a second dome */
    if (!fading.has(dome)) fadeOut(p, dome);
  } else if (!dome?.active || fading.has(dome)) {
    if (dome) removeDome(p, dome);
    dome = createDome(p);
    domes.set(p, dome);
  }
  const angle = p.state.lungeAngle ?? 0;
  /* A child of the player, offset like the rig, so it moves with the body every frame */
  dome.setPosition(
    p.rig.x + Math.cos(angle) * DOME_AHEAD,
    p.rig.y + p.bodyOffsetY + Math.sin(angle) * DOME_AHEAD,
  );
  dome.setRotation(angle);
  /* Behind the body when heading up the screen, so it never covers the head */
  if (Math.sin(angle) < 0) p.sendToBack(dome);
  else p.bringToTop(dome);
}

/** Local +x is the lunge direction: the flat back at x = 0, the rounded front at x = radius. */
function createDome(p: Player) {
  const dome = p.scene.make.graphics({}, false);
  p.add(dome);
  const step = DOME_RADIUS / DOME_SLICES;
  for (let i = 0; i < DOME_SLICES; i++) {
    const x = i * step;
    const mid = x + step / 2;
    const halfHeight = Math.sqrt(DOME_RADIUS ** 2 - mid ** 2);
    /* Brightest at the front, where the surface is seen edge-on, clear at the back */
    const t = (i + 1) / DOME_SLICES;
    dome.fillStyle(DOME_COLOR, DOME_ALPHA * t ** 1.5);
    dome.fillRect(x, -halfHeight, step, halfHeight * 2);
  }
  /* A thin rim along the leading curve */
  dome.lineStyle(1, DOME_COLOR, DOME_ALPHA);
  dome.beginPath();
  dome.arc(0, 0, DOME_RADIUS, -Math.PI / 2, Math.PI / 2);
  dome.strokePath();
  dome.setScale(DOME_DEPTH_SCALE, 1);
  return dome;
}

function fadeOut(p: Player, dome: Phaser.GameObjects.Graphics) {
  fading.add(dome);
  p.scene.tweens.add({
    targets: dome,
    alpha: 0,
    duration: DOME_FADE_MS,
    onComplete: () => removeDome(p, dome),
  });
}

function removeDome(p: Player, dome: Phaser.GameObjects.Graphics) {
  if (domes.get(p) === dome) domes.delete(p);
  p.scene.tweens.killTweensOf(dome);
  dome.destroy();
}
