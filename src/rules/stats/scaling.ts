/** How much each attribute point is worth. Tune these to rebalance every class at once. */

/** HP each point of vitality adds, on top of the starting `maxHp`. */
export const HP_PER_VITALITY = 7;
/** Stamina each point of vitality adds, so long fights don't drain every class to its min damage. */
export const SP_PER_VITALITY = 0.5;
/** Spell power each point of intelligence adds. */
export const SPELL_POWER_PER_INTELLIGENCE = 0.5;
/** Crit and dodge chance (percent) each point of dexterity adds. */
export const CRIT_PER_DEXTERITY = 0.2;
export const DODGE_PER_DEXTERITY = 0.15;
/** Percent faster swings per dexterity, and faster casts per intelligence: 20 points is 10%. */
export const ATTACK_SPEED_PER_DEXTERITY = 0.5;
export const CAST_SPEED_PER_INTELLIGENCE = 0.5;
/** Highest dodge or block chance (percent): stacking both still leaves most hits landing. */
export const MAX_AVOIDANCE = 60;
/** Highest elemental resistance (percent): past 100 an element would heal, so it stops short. */
export const MAX_RESISTANCE = 75;
export const RESISTANCES = [
  "fireResistance",
  "lightResistance",
  "waterResistance",
  "earthResistance",
] as const;
