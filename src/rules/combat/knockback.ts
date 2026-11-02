import { randomInt, type Rng } from "@/rules/loot";

/**
 * Whether a landed hit shoves its victim back: a lunge always does, other swings on a
 * `knockbackChance` percent roll (from gear, like crit chance). Rolls only when it has to.
 */
export function rollsKnockback(isLunge: boolean, knockbackChance: number | undefined, rng: Rng) {
  if (isLunge) return true;
  if (!knockbackChance || knockbackChance <= 0) return false;
  return randomInt(rng, 1, 100) <= knockbackChance;
}
