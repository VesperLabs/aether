export type CharClass = "mage" | "warrior" | "rogue" | "cleric";

export type StatName =
  | "accuracy"
  | "armorPierce"
  | "attackDelay"
  | "blockChance"
  | "castDelay"
  | "critChance"
  | "critMultiplier"
  | "defense"
  | "dexterity"
  | "dodgeChance"
  | "earthResistance"
  | "fireResistance"
  | "hpCost"
  | "hpSteal"
  | "intelligence"
  | "lightResistance"
  | "magicFind"
  | "maxDamage"
  | "maxEarthDamage"
  | "maxFireDamage"
  | "maxHp"
  | "maxLightDamage"
  | "maxMp"
  | "maxWaterDamage"
  | "minDamage"
  | "minEarthDamage"
  | "minFireDamage"
  | "minLightDamage"
  | "minWaterDamage"
  | "mpCost"
  | "mpSteal"
  | "poisonDamage"
  | "range"
  | "regenHp"
  | "regenMp"
  | "regenSp"
  | "spCost"
  | "spellPower"
  | "strength"
  | "vitality"
  | "walkSpeed"
  | "waterResistance";

export type PercentStatName =
  | "defense"
  | "dexterity"
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
export type StatRange = readonly [number, number];
export type StatValue = number | StatRange;

export type StatBlock = { readonly [K in StatName]?: StatValue };
export type PercentStatBlock = { readonly [K in PercentStatName]?: StatValue };
export type EffectBlock = { readonly [K in EffectName]?: StatValue };
