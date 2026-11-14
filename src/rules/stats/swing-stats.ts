/**
 * The stats a weapon gives only to its own swings. Dual-wielding, each hand swings with its own
 * weapon's: the other's damage, speed, crit and steal stay out of it. Everything else a weapon
 * carries (spell power, cast speed) counts from both hands, swinging or not.
 */
const SWING_STATS = new Set([
  "minDamage",
  "maxDamage",
  "minFireDamage",
  "maxFireDamage",
  "minWaterDamage",
  "maxWaterDamage",
  "minLightDamage",
  "maxLightDamage",
  "minEarthDamage",
  "maxEarthDamage",
  "minHolyDamage",
  "maxHolyDamage",
  "attackDelay",
  "accuracy",
  "critChance",
  "critMultiplier",
  "armorPierce",
  "hpSteal",
  "mpSteal",
  "spSteal",
  "range",
  "spCost",
]);

export const isSwingStat = (stat: string): boolean => SWING_STATS.has(stat);
