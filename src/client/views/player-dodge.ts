import Phaser from "phaser";
import { DODGE_DURATION, isDodging, isLunging } from "@/rules/movement";
import { trailDust } from "./lunge-dust";
import { updateVortex } from "./lunge-vortex";
import type { Player } from "./player";

/** One afterimage this often while rolling: close together, so the trail hugs the player. */
const GHOST_EVERY_MS = 20;
/** Alpha of the newest ghost, the one right behind the player. */
const GHOST_ALPHA = 0.2;
const GHOST_FADE_MS = 200;
/** The trail fades toward its tail: the first ghost of a roll has this share of the last one's alpha. */
const GHOST_TAIL_ALPHA_SHARE = 0.05;
/**
 * Each ghost springs after the player as it fades, as if pulled along: it closes this share of the
 * gap to where the player is now. Below 1 (with the overshoot) it never passes them or a wall.
 */
const GHOST_FOLLOW = 0.5;

const POSED_LAYERS = [
  "skin",
  "chest",
  "shadow",
  "face",
  "whiskers",
  "hair",
  "armor",
  "helmet",
  "boots",
  "gloves",
  "pants",
  "accessory",
] as const;

const lastGhost = new WeakMap<Player, number>();

/**
 * While a roll lasts: hold the walk pose and leave fading afterimages behind. Lunges kick up dust
 * instead, behind a vortex in front. Run after `drawFrame`.
 */
export function applyDodge(p: Player) {
  const now = Date.now();
  const rolling = isDodging(p.state, now);
  /* An attack out of a roll plays its swing; the trail keeps going */
  const posed = rolling && !p.state.isAttacking;
  if (posed) holdPose(p);
  else if (p.state.isDodgePosed) releasePose(p);
  if (rolling) trail(p, now, (now - (p.state.lastDodge ?? 0)) / DODGE_DURATION);
  const lunging = isLunging(p.state, now);
  if (lunging) trailDust(p, now);
  updateVortex(p, lunging, now);
}

function trail(p: Player, now: number, progress: number) {
  if (now - (lastGhost.get(p) ?? 0) < GHOST_EVERY_MS) return;
  lastGhost.set(p, now);
  leaveGhost(p, Math.min(1, progress));
}

function releasePose(p: Player) {
  p.state.isDodgePosed = false;
  for (const layer of POSED_LAYERS) p[layer]?.anims?.resume();
}

function holdPose(p: Player) {
  p.state.isDodgePosed = true;
  for (const layer of POSED_LAYERS) {
    const sprite = p[layer] as Phaser.GameObjects.Sprite | undefined;
    /* The walk's last frame, held through the roll so it reads as a leap, not a run */
    const frame = sprite?.anims?.currentAnim?.frames?.at(-1);
    if (!sprite || !frame) continue;
    if (sprite.anims.isPaused && sprite.anims.currentFrame === frame) continue;
    sprite.anims.pause(frame);
  }
}

/** The body's layers and hands, not the shadow or the name, bars and bubbles drawn over it. */
const GHOST_SKIP = new Set(["shadow", "userName", "hpBar", "bubble", "buffRack", "talkMenu"]);

/** A faint copy of the rig where the player is now, which fades out as they move on. */
function leaveGhost(p: Player, progress: number) {
  const { scene } = p;
  const skip = new Set(
    [...GHOST_SKIP].map((key) => (p as unknown as Record<string, unknown>)[key]),
  );
  /* Anchored at the player, so the parts keep their place as it drifts */
  const ghost = scene.add.container(p.x, p.y);
  for (const part of p.rig.list) {
    if (skip.has(part)) continue;
    const isDrawn =
      part instanceof Phaser.GameObjects.Sprite || part instanceof Phaser.GameObjects.Image;
    if (!isDrawn || !part.visible || !part.frame) continue;
    const m = part.getWorldTransformMatrix();
    const copy = scene.add.image(m.tx - p.x, m.ty - p.y, part.texture.key, part.frame.name);
    copy.setOrigin(part.originX, part.originY);
    copy.setScale(m.scaleX, m.scaleY);
    copy.setRotation(m.rotation);
    copy.setFlip(part.flipX, part.flipY);
    copy.setTint(part.tintTopLeft);
    ghost.add(copy);
  }
  ghost.setDepth(p.depth - 1);
  /* Squared, so the tail drops away fast and only the ghosts near the player read clearly */
  const falloff = GHOST_TAIL_ALPHA_SHARE + (1 - GHOST_TAIL_ALPHA_SHARE) * progress ** 2;
  ghost.setAlpha(GHOST_ALPHA * falloff * p.alpha);
  const start = { x: p.x, y: p.y };
  scene.tweens.addCounter({
    from: 0,
    to: GHOST_FOLLOW,
    duration: GHOST_FADE_MS,
    ease: "Back.easeOut",
    onUpdate: (tween) => {
      if (!ghost.active) return;
      const k = tween.getValue() ?? 0;
      ghost.setPosition(start.x + (p.x - start.x) * k, start.y + (p.y - start.y) * k);
    },
  });
  scene.tweens.add({
    targets: ghost,
    alpha: 0,
    duration: GHOST_FADE_MS,
    ease: "Quad.easeIn",
    onComplete: () => ghost.destroy(),
  });
}
