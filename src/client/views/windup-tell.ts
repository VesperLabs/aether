import Phaser from "phaser";
import type { Point } from "@/rules/world";
import type { Player } from "./player";

/** How far an NPC draws back from its target while winding up a weapon attack, in pixels. */
const LEAN_PIXELS = 6;
/** The lean lets go this long before the attack lands, in ms. */
const LEAN_RELEASE_MS = 40;
/** The body flashes white for this long right before the attack or spell lands, in ms. */
const FLASH_MS = 90;

/**
 * Telegraphs an incoming NPC attack or spell. Weapon attacks draw the body back from the target;
 * everything flashes white just before it lands, which reads from any side while circling.
 */
export function playWindupTell(
  attacker: Player,
  target: Point,
  { kind, windupMs }: { kind: "attack" | "cast"; windupMs: number },
) {
  if (!attacker?.scene) return;
  if (kind === "attack") lean(attacker, target, windupMs);
  attacker.scene.time.delayedCall(Math.max(0, windupMs - FLASH_MS), () => flash(attacker));
}

/** Draws the rig back from `target` for the windup, then lets go as the attack's lunge plays. */
function lean(attacker: Player, target: Point, ms: number) {
  const { rig } = attacker;
  const angle = Phaser.Math.Angle.Between(target.x, target.y, attacker.x, attacker.y);
  const dx = Math.cos(angle) * LEAN_PIXELS;
  const dy = Math.sin(angle) * LEAN_PIXELS;
  const offset = { t: 0 };
  let applied = { x: 0, y: 0 };
  const moveTo = (x: number, y: number) => {
    rig.setPosition(rig.x + x - applied.x, rig.y + y - applied.y);
    applied = { x, y };
  };
  attacker.scene.tweens.add({
    targets: offset,
    t: 1,
    duration: Math.max(0, ms - LEAN_RELEASE_MS),
    ease: "Quad.easeOut",
    onUpdate: () => moveTo(dx * offset.t, dy * offset.t),
    onComplete: () => moveTo(0, 0),
  });
}

/** Fills the rig's visible sprites with white, then puts their own tints back. */
function flash(attacker: Player) {
  if (!attacker.scene || attacker.state?.isDead) return;
  const sprites = attacker.rig.list.filter(
    (child): child is Phaser.GameObjects.Sprite =>
      child instanceof Phaser.GameObjects.Sprite && child.visible,
  );
  const saved = sprites.map((sprite) => ({
    sprite,
    tint: sprite.tintTopLeft,
    mode: sprite.tintMode,
  }));
  for (const { sprite } of saved) sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  attacker.scene.time.delayedCall(FLASH_MS, () => {
    for (const { sprite, tint, mode } of saved) {
      if (sprite.active) sprite.setTint(tint).setTintMode(mode);
    }
  });
}
