/** Levels per tier: each tier is one step of the power curve. */
const LEVELS_PER_POWER = 8;

/**
 * How strong things are at a level. Items, mobs, spells and unarmed damage all grow on this one
 * curve: every 8 levels, everything is worth one more level-1 item. Level 1 is 1, level 9 is 2,
 * level 17 is 3.
 */
export function levelPower(level: number): number {
  return 1 + (Math.max(1, level) - 1) / LEVELS_PER_POWER;
}

/** The level of an item tier, and the level needed to use it: tier 1 is 1, tier 2 is 9, 3 is 17. */
export function tierLevel(tier: number): number {
  return (Math.max(1, tier) - 1) * LEVELS_PER_POWER + 1;
}
