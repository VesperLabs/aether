import { unarmedDamage } from "./power";

/** The elements gear can add damage of. */
const ELEMENTS = ["Fire", "Water", "Light", "Earth", "Holy"] as const;

/**
 * Turns the damage gear adds up into what a character deals, in place on its stats. Fists plus
 * the weapon, times the attribute the weapon uses (strength, or dexterity for ranged). Gear can
 * add damage in half steps (see `scaleMod`), so every range is rounded down here, once, after it
 * adds up.
 */
export function finishDamage(stats: Record<string, number>, isRanged: boolean) {
  const [fistMin, fistMax] = unarmedDamage(stats.level);
  const attribute = isRanged ? stats.dexterity : stats.strength;
  const multiplier = 1 + Math.max(0, attribute) / 100;
  stats.minDamage = Math.floor((stats.minDamage + fistMin) * multiplier);
  stats.maxDamage = Math.max(Math.floor((stats.maxDamage + fistMax) * multiplier), stats.minDamage);
  for (const element of ELEMENTS) {
    const min = `min${element}Damage`;
    const max = `max${element}Damage`;
    /* Left missing when nothing adds it: a hand without fire has no fire range at all */
    if (stats[min] !== undefined) stats[min] = Math.floor(stats[min]);
    if (stats[max] !== undefined) stats[max] = Math.max(Math.floor(stats[max]), stats[min] ?? 0);
  }
}
