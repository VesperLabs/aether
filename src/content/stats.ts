const CHAR_CLASSES = ["mage", "warrior", "rogue", "cleric"] as const;
export type CharClass = (typeof CHAR_CLASSES)[number];

export type StatName =
  | "accuracy"
  | "armorPierce"
  | "attackDelay"
  | "blockChance"
  | "catchChance"
  | "castDelay"
  | "castTime"
  | "critChance"
  | "critMultiplier"
  | "defense"
  | "dexterity"
  | "dodgeChance"
  | "earthResistance"
  | "fireDamagePercent"
  | "fireResistance"
  | "hpCost"
  | "hpSteal"
  | "intelligence"
  | "lightResistance"
  | "magicFind"
  | "maxDamage"
  | "maxEarthDamage"
  | "maxFireDamage"
  | "maxHolyDamage"
  | "maxHp"
  | "maxLightDamage"
  | "maxMp"
  | "maxWaterDamage"
  | "minDamage"
  | "minEarthDamage"
  | "minFireDamage"
  | "minHolyDamage"
  | "minLightDamage"
  | "minWaterDamage"
  | "mpCost"
  | "mpSteal"
  | "poisonDamage"
  | "bleedDamage"
  | "burnDamage"
  | "range"
  | "regenHp"
  | "regenMp"
  | "regenSp"
  | "spCost"
  | "spSteal"
  | "spellPower"
  | "strength"
  | "vitality"
  | "walkSpeed"
  | "waterDamagePercent"
  | "waterResistance";

export type PercentStatName =
  | "attackDelay"
  | "castDelay"
  | "defense"
  | "dexterity"
  | "fireDamage"
  | "waterDamage"
  | "intelligence"
  | "maxHp"
  | "maxMp"
  | "strength"
  | "vitality"
  | "walkSpeed";

export type EffectName =
  | "hp"
  | "mp"
  | "minEarthDamage"
  | "maxEarthDamage"
  | "minFireDamage"
  | "maxFireDamage"
  | "minHolyDamage"
  | "maxHolyDamage"
  | "minLightDamage"
  | "maxLightDamage"
  | "minWaterDamage"
  | "maxWaterDamage";

/** A fixed value, or a `[min, max]` range that is rolled when the item is built. */
type StatRange = readonly [number, number];
type StatValue = number | StatRange;

export type StatBlock = { readonly [K in StatName]?: StatValue };
export type PercentStatBlock = { readonly [K in PercentStatName]?: StatValue };
export type EffectBlock = { readonly [K in EffectName]?: StatValue };
