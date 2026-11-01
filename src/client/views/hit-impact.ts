import Phaser from "phaser";
import type { HitMessage } from "@/network";
import { getAngleFromDirection } from "@/rules/world";
import type { Player } from "./player";

/** How long animations freeze when a hit lands, in ms. */
const HIT_STOP_MS = 60;
const CRIT_HIT_STOP_MS = 110;
/** How far the victim jolts away from the attacker, in pixels. */
const RECOIL_PIXELS = 4;
const CRIT_RECOIL_PIXELS = 8;
const RECOIL_MS = 140;
/** How far a melee attacker steps into the swing, in pixels. */
const LUNGE_PIXELS = 4;
const LUNGE_MS = 160;
/** How far an NPC draws back from its target while winding up, in pixels. */
const WINDUP_LEAN_PIXELS = 3;
/** The lean lets go this long before the attack lands, in ms. */
const WINDUP_RELEASE_MS = 40;
/** Share of the windup after which the body starts to shiver. */
const WINDUP_SHIVER_FROM = 0.7;
/** A killed character's corpse pops in from this scale. */
const CORPSE_POP_SCALE = 0.4;
const CORPSE_POP_MS = 220;

/**
 * Makes a damaging hit feel heavy: freezes both characters' animations for a moment, makes the
 * victim recoil from the attacker. Visual only.
 */
export function playHitImpact(
  victim: Player | undefined,
  attacker: Player | undefined,
  hit: Pick<HitMessage, "type" | "amount" | "isCritical">,
) {
  if (!victim?.scene || victim.state?.isDead) return;
  const isKill = hit.type === "death";
  if (!isKill && (hit.type !== "hp" || (hit.amount ?? 0) >= 0)) return;
  /* Killing blows land as hard as crits */
  const isCritical = !!hit.isCritical || isKill;

  freezeAnimations(victim, isCritical ? CRIT_HIT_STOP_MS : HIT_STOP_MS);
  if (attacker && attacker !== victim) {
    freezeAnimations(attacker, isCritical ? CRIT_HIT_STOP_MS : HIT_STOP_MS);
    /* A killed victim turns into a corpse, which should not flinch */
    if (!isKill) recoil(victim, attacker, isCritical ? CRIT_RECOIL_PIXELS : RECOIL_PIXELS);
  }
  if (isKill) popCorpse(victim);
}

function getAnimatedSprites(player: Player) {
  return player.rig.list.filter(
    (child): child is Phaser.GameObjects.Sprite =>
      child instanceof Phaser.GameObjects.Sprite && child.anims?.isPlaying,
  );
}

function freezeAnimations(player: Player, ms: number) {
  const sprites = getAnimatedSprites(player);
  for (const sprite of sprites) sprite.anims.pause();
  player.scene.time.delayedCall(ms, () => {
    for (const sprite of sprites) if (sprite.active) sprite.anims.resume();
  });
}

/** The corpse bounces in instead of appearing all at once. */
function popCorpse(victim: Player) {
  const { corpse } = victim;
  const scale = corpse.scale;
  corpse.setScale(scale * CORPSE_POP_SCALE);
  victim.scene.tweens.add({
    targets: corpse,
    scale,
    duration: CORPSE_POP_MS,
    ease: "Back.easeOut",
  });
}

/** Steps a melee attacker's body into the swing. Ranged attacks stand still. */
export function playAttackLunge(attacker: Player, direction: string) {
  if (!attacker?.scene || attacker.hasRangedWeapon()) return;
  const angle = Phaser.Math.DegToRad(getAngleFromDirection(direction));
  nudgeBody(attacker, angle, LUNGE_PIXELS, LUNGE_MS);
}

/**
 * Telegraphs an incoming attack or spell: the body draws back from the target for the whole
 * windup, shivers just before it lands, then snaps back as the attack's own lunge plays.
 */
export function playWindupLean(attacker: Player, target: { x: number; y: number }, ms: number) {
  if (!attacker?.scene) return;
  const { rig } = attacker;
  const angle = Phaser.Math.Angle.Between(target.x, target.y, attacker.x, attacker.y);
  const dx = Math.cos(angle) * WINDUP_LEAN_PIXELS;
  const dy = Math.sin(angle) * WINDUP_LEAN_PIXELS;
  const offset = { t: 0 };
  let applied = { x: 0, y: 0 };
  const moveTo = (x: number, y: number) => {
    rig.setPosition(rig.x + x - applied.x, rig.y + y - applied.y);
    applied = { x, y };
  };
  attacker.scene.tweens.add({
    targets: offset,
    t: 1,
    duration: Math.max(0, ms - WINDUP_RELEASE_MS),
    ease: "Quad.easeOut",
    onUpdate: (tween) => {
      /* Shiver through the last part of the windup, so the moment it lands is readable */
      const shake = tween.progress > WINDUP_SHIVER_FROM ? Math.sin(tween.elapsed * 0.25) : 0;
      moveTo(dx * offset.t + dy * shake * 0.25, dy * offset.t - dx * shake * 0.25);
    },
    onComplete: () => moveTo(0, 0),
  });
}

/** A visual flinch, not a knockback: the victim's body jolts away from the attacker. */
function recoil(victim: Player, attacker: Player, pixels: number) {
  const angle = Phaser.Math.Angle.Between(attacker.x, attacker.y, victim.x, victim.y);
  nudgeBody(victim, angle, pixels, RECOIL_MS);
}

/**
 * Shifts the character's rig (not the container itself, whose position the network owns) along
 * `angle` and springs it back. Nudges add up, so a lunge and a recoil can overlap.
 */
function nudgeBody(player: Player, angle: number, pixels: number, ms: number) {
  const { rig } = player;
  const dx = Math.cos(angle) * pixels;
  const dy = Math.sin(angle) * pixels;
  const offset = { t: 0 };
  let applied = 0;
  player.scene.tweens.add({
    targets: offset,
    t: 1,
    duration: ms,
    ease: (k: number) => Math.sin(k * Math.PI) * (1 - k * 0.5),
    onUpdate: () => {
      const step = offset.t - applied;
      applied = offset.t;
      rig.setPosition(rig.x + dx * step, rig.y + dy * step);
    },
    onComplete: () => rig.setPosition(rig.x - dx * applied, rig.y - dy * applied),
  });
}
