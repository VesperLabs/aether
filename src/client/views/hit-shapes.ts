import Phaser from "phaser";
import type { Box, Shape } from "@/rules/movement";

const SHOW_MS = 1000;
const SPELL_COLOR = 0xff00ff;
const VICTIM_COLOR = 0x00ffff;

/** Outlines the spell and hit box the server compared for a hit, then fades them out. */
export function drawHitShapes(scene: Phaser.Scene, spell: Shape, victim: Box) {
  const g = scene.add.graphics().setDepth(Number.MAX_SAFE_INTEGER);
  g.lineStyle(1, VICTIM_COLOR, 1);
  g.strokeRect(
    victim.x - victim.halfWidth,
    victim.y - victim.halfHeight,
    victim.halfWidth * 2,
    victim.halfHeight * 2,
  );
  g.lineStyle(1, SPELL_COLOR, 1);
  if (spell.kind === "circle") g.strokeCircle(spell.x, spell.y, spell.radius);
  else {
    g.strokeRect(
      spell.x - spell.halfWidth,
      spell.y - spell.halfHeight,
      spell.halfWidth * 2,
      spell.halfHeight * 2,
    );
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: SHOW_MS, onComplete: () => g.destroy() });
}
