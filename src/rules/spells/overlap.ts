import type { Box, Circle } from "../movement";

/** What the hit shapes read from a character. */
export interface CharacterShapeInput {
  x: number;
  y: number;
  bodySize: number;
  hitBoxSize: { width: number; height: number };
  /** Trimmed off the top and bottom of the hit box. */
  hitBoxInset?: number;
}

/** The box a spell must touch to hit a character: stands on the character's feet, head up. */
export function characterHitBox(character: CharacterShapeInput): Box {
  const { width, height } = character.hitBoxSize;
  const inset = character.hitBoxInset ?? 0;
  const bottom = character.y + character.bodySize;
  return {
    x: character.x,
    y: bottom - height / 2,
    halfWidth: width / 2,
    halfHeight: Math.max(0, height / 2 - inset),
  };
}

/** Leading a moving target: how fast the projectile flies, and how much of the lead to take (0..1). */
export interface AimLead {
  projectileSpeed: number;
  ratio: number;
}

/**
 * The angle to fire a projectile at so it flies from where it spawns (the caster's body centre,
 * `bodyCenterY` below its position) through the middle of the target's hit box. With `lead`, it
 * aims that share of the way toward where a moving target will be when the projectile arrives.
 */
export function getAimAngle(
  caster: { x: number; y: number; bodyCenterY: number },
  target: CharacterShapeInput & { vx?: number; vy?: number },
  lead?: AimLead,
): number {
  const from = { x: caster.x, y: caster.y + caster.bodyCenterY };
  const aim = characterHitBox(target);
  if (lead && lead.projectileSpeed > 0) {
    const flightTime = Math.hypot(aim.x - from.x, aim.y - from.y) / lead.projectileSpeed;
    aim.x += (target.vx ?? 0) * flightTime * lead.ratio;
    aim.y += (target.vy ?? 0) * flightTime * lead.ratio;
  }
  return Math.atan2(aim.y - from.y, aim.x - from.x);
}

/** The small circle around a character's feet, used for single-target melee hits. */
export function characterBodyCircle(character: CharacterShapeInput): Circle {
  return { x: character.x, y: character.y, radius: character.bodySize };
}
