import Phaser from "phaser";
import type { Box, Shape } from "@/rules/movement";
import { DEBUG_COLORS, DEBUG_FILL_ALPHA } from "./debug-palette";

/** How long a confirmed hit stays drawn, fading. Short, so a fight doesn't pile them up. */
const SHOW_MS = 400;

/** Outlines the spell and hit box the server compared for a hit, then fades them out. */
export function drawHitShapes(scene: Phaser.Scene, spell: Shape, victim: Box) {
  const g = scene.add.graphics().setDepth(Number.MAX_SAFE_INTEGER);
  /* The victim, loudest: this is what got hit */
  g.fillStyle(DEBUG_COLORS.hit, DEBUG_FILL_ALPHA * 2).lineStyle(1, DEBUG_COLORS.hit, 1);
  g.fillRect(
    victim.x - victim.halfWidth,
    victim.y - victim.halfHeight,
    victim.halfWidth * 2,
    victim.halfHeight * 2,
  );
  g.strokeRect(
    victim.x - victim.halfWidth,
    victim.y - victim.halfHeight,
    victim.halfWidth * 2,
    victim.halfHeight * 2,
  );
  /* The attack's area as the server judged it, outline only: a swing's own wedge is already filled */
  g.lineStyle(1, DEBUG_COLORS.attack, 1);
  if (spell.kind === "circle") g.strokeCircle(spell.x, spell.y, spell.radius);
  else if (spell.kind === "sector") {
    const from = Phaser.Math.DegToRad(spell.from);
    const to = Phaser.Math.DegToRad(spell.from + spell.span);
    g.beginPath();
    g.moveTo(spell.x, spell.y);
    g.arc(spell.x, spell.y, spell.radius, from, to);
    g.closePath();
    g.strokePath();
  } else {
    g.strokeRect(
      spell.x - spell.halfWidth,
      spell.y - spell.halfHeight,
      spell.halfWidth * 2,
      spell.halfHeight * 2,
    );
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: SHOW_MS, onComplete: () => g.destroy() });
}
