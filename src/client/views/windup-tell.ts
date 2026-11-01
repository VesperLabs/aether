import Phaser from "phaser";
import type { Point } from "@/rules/world";
import type { Player } from "./player";

/** How far an NPC draws back from its target while winding up a weapon attack, in pixels. */
const LEAN_PIXELS = 6;
/** The lean lets go this long before the attack lands, in ms. */
const LEAN_RELEASE_MS = 40;

/** Telegraphs an incoming NPC weapon attack: the body draws back from the target. */
export function playWindupTell(
  attacker: Player,
  target: Point,
  { kind, windupMs }: { kind: "attack" | "cast"; windupMs: number },
) {
  if (!attacker?.scene) return;
  if (kind === "attack") lean(attacker, target, windupMs);
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
