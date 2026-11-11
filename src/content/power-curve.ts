/**
 * How strong things are at a level. Items, mobs and unarmed damage all grow on this one curve, so
 * one level of gear is always worth the same against one level of monster.
 *
 * Level 1 is 1, and every 8 levels adds 1 more: level 9 is 2, level 17 is 3.
 */
export function levelPower(level: number): number {
  return 1 + (Math.max(1, level) - 1) / 8;
}

/** Levels between two steps of the curve; the old item levels 1, 2, 3 sit at levels 1, 9, 17. */
export const LEVELS_PER_POWER = 8;
