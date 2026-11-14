import type { TriggerDefinition } from "../buffs/trigger-types";
import type { PercentStatName, StatName } from "../stats";
import type { GearType } from "./gear-types";

/**
 * How rare and strong a mod is. `normal` mods are plain stats; `major` ones change how an item
 * plays (a trigger, a spell that fires twice) and come from rarer cards.
 */
type ModPower = "normal" | "major";

/**
 * Everything gear does beyond its family's base stats is a mod: a card slotted into one of its
 * slots, a unique's fixed mod, or a set bonus. Each changes one thing: a stat (a damage range
 * counts as one), a percent stat, or a trigger. Values are for tier 1; on an item, stats and
 * trigger levels are multiplied by its tier, the same way buffs scale with their level. Percent
 * stats are not: they already grow with the stats they multiply. Nothing is rolled.
 */
interface ModDefinition {
  readonly label: string;
  readonly power: ModPower;
  readonly stats?: { readonly [K in StatName]?: number };
  readonly percentStats?: { readonly [K in PercentStatName]?: number };
  /** A trigger's `level` is multiplied by the tier; its chance stays. */
  readonly triggers?: readonly TriggerDefinition[];
  /** The gear it can go on: only a few kinds, so every slot is a choice. */
  readonly types: readonly GearType[];
  /** How it shows on the item: an outline and particles, drawn wherever the item is. */
  readonly effect?: ItemEffect;
}

/** Every look a mod can give an item. Each needs its art in the UI's `ELEMENT_EFFECTS`. */
export type ItemEffect = "fire" | "water" | "light" | "earth" | "holy";

const WEAPONS = ["weapon", "ranged"] as const;

/**
 * Every trigger mod fires on 1 hit in 20 (5%), so stacking copies only ever adds a little.
 * A "when you hit" mod goes on weapons; a "when you're hurt" one on anything but.
 */
const CHANCE = 20;

const onHit = (type: "buff" | "debuff", name: TriggerDefinition["name"]) =>
  [{ event: "onAttackHit", type, name, level: 1, chance: CHANCE }] as TriggerDefinition[];

const onHurt = (name: TriggerDefinition["name"]) =>
  [{ event: "onHurt", type: "buff", name, level: 1, chance: CHANCE }] as TriggerDefinition[];

/* Each mod fits only a few kinds of gear, so every slot is a choice */
const MODS = {
  /* Power */
  sharp: { label: "Sharp", power: "normal", stats: { minDamage: 1, maxDamage: 2 }, types: WEAPONS },
  piercing: {
    label: "Piercing",
    power: "normal",
    stats: { armorPierce: 3 },
    types: ["weapon", "gloves"],
  },
  sturdy: {
    label: "Sturdy",
    power: "normal",
    stats: { defense: 3 },
    types: ["armor", "pants", "shield"],
  },
  arcane: {
    label: "Arcane",
    power: "normal",
    stats: { spellPower: 2 },
    types: ["weapon", "helmet", "amulet"],
  },
  lucky: {
    label: "Lucky",
    power: "normal",
    stats: { magicFind: 8 },
    types: ["helmet", "accessory"],
  },
  fiery: {
    label: "Fiery",
    power: "normal",
    stats: { minFireDamage: 1, maxFireDamage: 2 },
    types: WEAPONS,
    effect: "fire",
  },
  frozen: {
    label: "Frozen",
    power: "normal",
    stats: { minWaterDamage: 1, maxWaterDamage: 2 },
    types: WEAPONS,
    effect: "water",
  },
  shocking: {
    label: "Shocking",
    power: "normal",
    stats: { minLightDamage: 1, maxLightDamage: 2 },
    types: WEAPONS,
    effect: "light",
  },
  earthen: {
    label: "Earthen",
    power: "normal",
    stats: { minEarthDamage: 1, maxEarthDamage: 2 },
    types: WEAPONS,
    effect: "earth",
  },
  radiant: {
    label: "Radiant",
    power: "normal",
    stats: { minHolyDamage: 1, maxHolyDamage: 2 },
    types: WEAPONS,
    effect: "holy",
  },

  /* Attributes */
  strong: { label: "Strong", power: "normal", stats: { strength: 2 }, types: ["gloves", "ring"] },
  agile: { label: "Agile", power: "normal", stats: { dexterity: 2 }, types: ["boots", "ring"] },
  vital: { label: "Vital", power: "normal", stats: { vitality: 2 }, types: ["armor", "amulet"] },
  wise: { label: "Wise", power: "normal", stats: { intelligence: 2 }, types: ["helmet", "ring"] },

  /* Utility */
  mending: { label: "Mending", power: "normal", stats: { regenHp: 3 }, types: ["armor", "pants"] },
  focused: {
    label: "Focused",
    power: "normal",
    stats: { regenMp: 2 },
    types: ["helmet", "amulet"],
  },
  swift: { label: "Swift", power: "normal", stats: { walkSpeed: 5 }, types: ["boots"] },
  hasty: {
    label: "Hasty",
    power: "normal",
    stats: { attackDelay: -8 },
    types: ["weapon", "gloves"],
  },
  casting: {
    label: "Casting",
    power: "normal",
    stats: { castDelay: -30 },
    types: ["weapon", "gloves"],
  },
  blocking: { label: "Blocking", power: "normal", stats: { blockChance: 3 }, types: ["shield"] },
  reaching: { label: "Reaching", power: "normal", stats: { range: 0.5 }, types: ["ranged"] },
  precise: {
    label: "Precise",
    power: "normal",
    stats: { critChance: 2 },
    types: ["ranged", "gloves"],
  },
  evasive: {
    label: "Evasive",
    power: "normal",
    stats: { dodgeChance: 2 },
    types: ["boots", "accessory"],
  },
  leeching: {
    label: "Leeching",
    power: "normal",
    stats: { hpSteal: 1 },
    types: ["weapon", "ring"],
  },
  siphoning: {
    label: "Siphoning",
    power: "normal",
    stats: { mpSteal: 1 },
    types: ["weapon", "amulet"],
  },

  /* Wards: each guards one place, and the shield takes any */
  flameWard: {
    label: "Flame Ward",
    power: "normal",
    stats: { fireResistance: 5 },
    types: ["armor", "shield"],
  },
  stormWard: {
    label: "Storm Ward",
    power: "normal",
    stats: { lightResistance: 5 },
    types: ["helmet", "shield"],
  },
  tideWard: {
    label: "Tide Ward",
    power: "normal",
    stats: { waterResistance: 5 },
    types: ["boots", "shield"],
  },
  stoneWard: {
    label: "Stone Ward",
    power: "normal",
    stats: { earthResistance: 5 },
    types: ["pants", "shield"],
  },

  /* Percent: they grow with you already, so tier doesn't multiply them */
  sanguine: { label: "Sanguine", power: "normal", percentStats: { maxHp: 12 }, types: ["amulet"] },
  lunar: { label: "Lunar", power: "normal", percentStats: { maxMp: 12 }, types: ["ring"] },

  /* Major, when you hit: weapons only */
  venomous: {
    label: "Venomous",
    power: "major",
    triggers: onHit("debuff", "poison"),
    types: WEAPONS,
  },
  bleeding: {
    label: "Bleeding",
    power: "major",
    triggers: onHit("debuff", "bleed"),
    types: ["weapon"],
  },
  stunning: {
    label: "Stunning",
    power: "major",
    triggers: onHit("debuff", "stun"),
    types: ["weapon"],
  },
  slowing: {
    label: "Slowing",
    power: "major",
    triggers: onHit("debuff", "slow"),
    types: ["ranged"],
  },
  adrenal: {
    label: "Adrenal",
    power: "major",
    triggers: onHit("buff", "adrenaline"),
    types: WEAPONS,
  },
  vampiric: {
    label: "Vampiric",
    power: "major",
    triggers: onHit("buff", "vampire"),
    types: WEAPONS,
  },
  draining: {
    label: "Draining",
    power: "major",
    triggers: onHit("buff", "siphon"),
    types: WEAPONS,
  },
  frenzied: { label: "Frenzied", power: "major", triggers: onHit("buff", "haste"), types: WEAPONS },

  /* Major, when you're hurt: never on weapons */
  wrathful: {
    label: "Wrathful",
    power: "major",
    triggers: onHurt("brute"),
    types: ["helmet", "gloves"],
  },
  elusive: {
    label: "Elusive",
    power: "major",
    triggers: onHurt("evasion"),
    types: ["boots", "pants"],
  },
  enduring: { label: "Enduring", power: "major", triggers: onHurt("endurance"), types: ["armor"] },
  inspired: { label: "Inspired", power: "major", triggers: onHurt("genius"), types: ["helmet"] },
  lucid: { label: "Lucid", power: "major", triggers: onHurt("clarity"), types: ["amulet"] },
  fortunate: {
    label: "Fortunate",
    power: "major",
    triggers: onHurt("fortune"),
    types: ["accessory"],
  },
  regenerating: {
    label: "Regenerating",
    power: "major",
    triggers: onHurt("regeneration"),
    types: ["armor", "pants"],
  },
  dawning: { label: "Dawning", power: "major", triggers: onHurt("aureole"), types: ["shield"] },

  /* Unique: only on unique cards */
  wyrmscale: {
    label: "Wyrmscale",
    power: "major",
    triggers: onHurt("guard"),
    types: ["armor", "shield"],
  },
} as const satisfies Readonly<Record<string, ModDefinition>>;

export type ModName = keyof typeof MODS;

/** What a mod adds to an item of `tier`: its tier 1 values, times the tier (but not percents). */
export interface ScaledMod {
  stats: Record<string, number>;
  percentStats: Record<string, number>;
  triggers: TriggerDefinition[];
}

const times = (block: Readonly<Record<string, number>> = {}, tier: number) =>
  Object.fromEntries(Object.entries(block).map(([stat, value]) => [stat, value * tier]));

export function scaleMod(name: ModName, tier: number): ScaledMod {
  const mod: ModDefinition = MODS[name];
  return {
    stats: times(mod.stats, tier),
    percentStats: { ...mod.percentStats },
    triggers: (mod.triggers ?? []).map((trigger) => ({ ...trigger, level: trigger.level * tier })),
  };
}

/** Several mods at one tier, added together: a set bonus, or every mod on an item. */
export function sumMods(names: readonly ModName[], tier: number): ScaledMod {
  const total: ScaledMod = { stats: {}, percentStats: {}, triggers: [] };
  for (const scaled of names.map((name) => scaleMod(name, tier))) {
    addInto(total.stats, scaled.stats);
    addInto(total.percentStats, scaled.percentStats);
    total.triggers.push(...scaled.triggers);
  }
  return total;
}

function addInto(into: Record<string, number>, from: Record<string, number>) {
  for (const [stat, value] of Object.entries(from)) into[stat] = (into[stat] ?? 0) + value;
}

/** How an item looks from its mods: the effect of its own mod, then of each filled slot. */
export function itemEffects(
  item: { fixedMod?: string; mods?: readonly (string | null)[] } | null | undefined,
): ItemEffect[] {
  const names = [item?.fixedMod, ...(item?.mods ?? [])];
  const effects = names.map(
    (name) => name && (MODS as Record<string, ModDefinition>)[name]?.effect,
  );
  return [...new Set(effects.filter((effect): effect is ItemEffect => !!effect))];
}

/** The gear `name` can go on. */
export function modGearTypes(name: string): readonly GearType[] {
  return (MODS as Record<string, ModDefinition>)[name]?.types ?? [];
}

/** Whether `name` is a mod that can go on gear of `type`: what a slotted card must pass. */
export function canSlotMod(name: string, type: string): name is ModName {
  const mod: ModDefinition | undefined = (MODS as Record<string, ModDefinition>)[name];
  return !!mod && (mod.types as readonly string[]).includes(type);
}
