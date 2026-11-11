import { levelPower } from "@/content";

/**
 * Damage a character deals with bare hands at a level. A held weapon adds its damage on top, so
 * gear is worth about the same share of damage at every level.
 */
export function unarmedDamage(level: number): [number, number] {
  const power = levelPower(level);
  return [Math.round(power), Math.round(2 * power)];
}

/** How much defense an attacker of this level shrugs off: defense equal to it halves damage. */
export const DEFENSE_PER_POWER = 40;

/**
 * The share of physical damage that `defense` stops, from 0 up to (never reaching) 1. Diminishing
 * returns: each point counts for less, and a stronger attacker needs more defense to stop.
 */
export function defenseReduction(defense: number, attackerLevel: number): number {
  const d = Math.max(0, defense);
  return d / (d + DEFENSE_PER_POWER * levelPower(attackerLevel));
}

/** A monster's HP at its level, before its own `maxHp` override. */
export function monsterHealth(level: number): number {
  return Math.round(18 * levelPower(level) * (1 + level / 50));
}
