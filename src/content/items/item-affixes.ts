import type { StatName, StatRange } from "../stats";

/** The item types random affixes can roll on. */
type AffixItemType =
  | "weapon"
  | "ranged"
  | "shield"
  | "helmet"
  | "armor"
  | "gloves"
  | "boots"
  | "pants"
  | "accessory"
  | "ring"
  | "amulet";

/**
 * How an affix grows with the item's level: `full` on the level curve (flat damage, defense,
 * attributes), `half` as fast (percent chances, which would run away), `none` for speeds and reach.
 */
type AffixScale = "full" | "half" | "none";

/**
 * A random affix a magic or rare item can roll. Prefixes are power (damage, defense, life),
 * suffixes are everything else. Values are for a level 1 item and grow with the item's own level.
 */
export interface AffixDefinition {
  readonly name: string;
  readonly kind: "prefix" | "suffix";
  /** The lowest item level that can roll it. */
  readonly level: number;
  readonly scale: AffixScale;
  readonly stats: { readonly [K in StatName]?: StatRange };
  readonly types: readonly AffixItemType[];
}

const WEAPONS = ["weapon", "ranged"] as const;
const ARMOR = ["helmet", "armor", "gloves", "boots", "pants", "shield"] as const;
const JEWELRY = ["ring", "amulet", "accessory"] as const;
const ALL = [...WEAPONS, ...ARMOR, ...JEWELRY] as const;

export const AFFIXES = [
  /* Prefixes: power */
  {
    name: "Sharp",
    kind: "prefix",
    level: 1,
    scale: "full",
    stats: { minDamage: [1, 1], maxDamage: [1, 2] },
    types: WEAPONS,
  },
  {
    name: "Piercing",
    kind: "prefix",
    level: 1,
    scale: "full",
    stats: { armorPierce: [2, 4] },
    types: [...WEAPONS, "gloves"],
  },
  {
    name: "Sturdy",
    kind: "prefix",
    level: 1,
    scale: "full",
    stats: { defense: [2, 4] },
    types: ARMOR,
  },
  {
    name: "Hale",
    kind: "prefix",
    level: 1,
    scale: "full",
    stats: { maxHp: [4, 8] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "Mystic",
    kind: "prefix",
    level: 1,
    scale: "full",
    stats: { maxMp: [4, 8] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "Arcane",
    kind: "prefix",
    level: 1,
    scale: "full",
    stats: { spellPower: [1, 2] },
    types: ["weapon", "helmet", ...JEWELRY],
  },
  {
    name: "Lucky",
    kind: "prefix",
    level: 1,
    scale: "half",
    stats: { magicFind: [5, 10] },
    types: ["helmet", "gloves", "boots", ...JEWELRY],
  },
  {
    name: "Fiery",
    kind: "prefix",
    level: 9,
    scale: "full",
    stats: { minFireDamage: [0, 1], maxFireDamage: [1, 3] },
    types: WEAPONS,
  },
  {
    name: "Frozen",
    kind: "prefix",
    level: 9,
    scale: "full",
    stats: { minWaterDamage: [0, 1], maxWaterDamage: [1, 3] },
    types: WEAPONS,
  },
  {
    name: "Shocking",
    kind: "prefix",
    level: 9,
    scale: "full",
    stats: { minLightDamage: [0, 1], maxLightDamage: [1, 3] },
    types: WEAPONS,
  },
  {
    name: "Earthen",
    kind: "prefix",
    level: 9,
    scale: "full",
    stats: { minEarthDamage: [0, 1], maxEarthDamage: [1, 3] },
    types: WEAPONS,
  },

  /* Suffixes: attributes, utility and resistances */
  {
    name: "of Strength",
    kind: "suffix",
    level: 1,
    scale: "full",
    stats: { strength: [1, 3] },
    types: ALL,
  },
  {
    name: "of Dexterity",
    kind: "suffix",
    level: 1,
    scale: "full",
    stats: { dexterity: [1, 3] },
    types: ALL,
  },
  {
    name: "of Vitality",
    kind: "suffix",
    level: 1,
    scale: "full",
    stats: { vitality: [1, 3] },
    types: ALL,
  },
  {
    name: "of Intelligence",
    kind: "suffix",
    level: 1,
    scale: "full",
    stats: { intelligence: [1, 3] },
    types: ALL,
  },
  {
    name: "of Mending",
    kind: "suffix",
    level: 1,
    scale: "full",
    stats: { regenHp: [1, 1] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "of Focus",
    kind: "suffix",
    level: 1,
    scale: "full",
    stats: { regenMp: [1, 1] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "of the Wind",
    kind: "suffix",
    level: 1,
    scale: "none",
    stats: { walkSpeed: [3, 6] },
    types: ["boots", "pants"],
  },
  {
    name: "of Haste",
    kind: "suffix",
    level: 1,
    scale: "none",
    stats: { attackDelay: [-10, -5] },
    types: [...WEAPONS, "gloves", "ring"],
  },
  {
    name: "of Casting",
    kind: "suffix",
    level: 1,
    scale: "none",
    stats: { castDelay: [-40, -20] },
    types: ["weapon", "helmet", "ring", "amulet"],
  },
  {
    name: "of Flame Ward",
    kind: "suffix",
    level: 1,
    scale: "half",
    stats: { fireResistance: [3, 6] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "of Storm Ward",
    kind: "suffix",
    level: 1,
    scale: "half",
    stats: { lightResistance: [3, 6] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "of Tide Ward",
    kind: "suffix",
    level: 1,
    scale: "half",
    stats: { waterResistance: [3, 6] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "of Stone Ward",
    kind: "suffix",
    level: 1,
    scale: "half",
    stats: { earthResistance: [3, 6] },
    types: [...ARMOR, ...JEWELRY],
  },
  {
    name: "of Blocking",
    kind: "suffix",
    level: 1,
    scale: "half",
    stats: { blockChance: [2, 4] },
    types: ["shield"],
  },
  {
    name: "of Reach",
    kind: "suffix",
    level: 1,
    scale: "none",
    stats: { range: [0.5, 0.5] },
    types: ["ranged"],
  },
  {
    name: "of Precision",
    kind: "suffix",
    level: 9,
    scale: "half",
    stats: { critChance: [1, 3] },
    types: [...WEAPONS, "gloves", ...JEWELRY],
  },
  {
    name: "of Evasion",
    kind: "suffix",
    level: 9,
    scale: "half",
    stats: { dodgeChance: [1, 3] },
    types: [...ARMOR, "ranged", ...JEWELRY],
  },
  {
    name: "of the Leech",
    kind: "suffix",
    level: 9,
    scale: "half",
    stats: { hpSteal: [1, 2] },
    types: [...WEAPONS, "ring", "amulet"],
  },
  {
    name: "of the Siphon",
    kind: "suffix",
    level: 9,
    scale: "half",
    stats: { mpSteal: [1, 2] },
    types: [...WEAPONS, "ring", "amulet"],
  },
] as const satisfies readonly AffixDefinition[];
