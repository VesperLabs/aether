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
 * counts as one), a percent stat, or a trigger. Values are for tier 1; on an item they are
 * multiplied by its tier, the same way buffs scale with their level. Nothing is rolled.
 */
interface ModDefinition {
  readonly label: string;
  readonly power: ModPower;
  readonly stats?: { readonly [K in StatName]?: number };
  readonly percentStats?: { readonly [K in PercentStatName]?: number };
  /** A trigger's `level` is multiplied by the tier; its chance stays. */
  readonly triggers?: readonly TriggerDefinition[];
  /** The gear it can go on. Every type when left out. */
  readonly types?: readonly GearType[];
  /** How it shows on the item: an outline and particles, drawn wherever the item is. */
  readonly effect?: ItemEffect;
}

/** Every look a mod can give an item. Each needs its art in the UI's `ELEMENT_EFFECTS`. */
export type ItemEffect = "fire" | "water" | "light" | "earth" | "holy";

const WEAPONS = ["weapon", "ranged"] as const;
const ARMOR = ["helmet", "armor", "gloves", "boots", "pants", "shield"] as const;
const JEWELRY = ["ring", "amulet", "accessory"] as const;
const WORN = [...ARMOR, ...JEWELRY] as const;

const onHit = (type: "debuff", name: "poison" | "bleed" | "stun" | "slow", chance: number) =>
  [{ event: "onAttackHit", type, name, level: 1, chance }] as const;

const MODS = {
  /* Power */
  sharp: { label: "Sharp", power: "normal", stats: { minDamage: 1, maxDamage: 2 }, types: WEAPONS },
  piercing: {
    label: "Piercing",
    power: "normal",
    stats: { armorPierce: 3 },
    types: [...WEAPONS, "gloves"],
  },
  sturdy: { label: "Sturdy", power: "normal", stats: { defense: 3 }, types: ARMOR },
  hale: { label: "Hale", power: "normal", stats: { maxHp: 6 }, types: WORN },
  mystic: { label: "Mystic", power: "normal", stats: { maxMp: 6 }, types: WORN },
  arcane: {
    label: "Arcane",
    power: "normal",
    stats: { spellPower: 2 },
    types: ["weapon", "helmet", ...JEWELRY],
  },
  lucky: {
    label: "Lucky",
    power: "normal",
    stats: { magicFind: 8 },
    types: ["helmet", "gloves", "boots", ...JEWELRY],
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
  strong: { label: "Strong", power: "normal", stats: { strength: 2 } },
  agile: { label: "Agile", power: "normal", stats: { dexterity: 2 } },
  vital: { label: "Vital", power: "normal", stats: { vitality: 2 } },
  wise: { label: "Wise", power: "normal", stats: { intelligence: 2 } },

  /* Utility */
  mending: { label: "Mending", power: "normal", stats: { regenHp: 1 }, types: WORN },
  focused: { label: "Focused", power: "normal", stats: { regenMp: 1 }, types: WORN },
  swift: { label: "Swift", power: "normal", stats: { walkSpeed: 5 }, types: ["boots", "pants"] },
  hasty: {
    label: "Hasty",
    power: "normal",
    stats: { attackDelay: -8 },
    types: [...WEAPONS, "gloves", "ring"],
  },
  casting: {
    label: "Casting",
    power: "normal",
    stats: { castDelay: -30 },
    types: ["weapon", "helmet", "gloves", "ring", "amulet"],
  },
  blocking: {
    label: "Blocking",
    power: "normal",
    stats: { blockChance: 3 },
    types: ["shield", ...WEAPONS],
  },
  reaching: { label: "Reaching", power: "normal", stats: { range: 0.5 }, types: ["ranged"] },
  precise: {
    label: "Precise",
    power: "normal",
    stats: { critChance: 2 },
    types: [...WEAPONS, "gloves", ...JEWELRY],
  },
  evasive: {
    label: "Evasive",
    power: "normal",
    stats: { dodgeChance: 2 },
    types: [...WORN, "ranged"],
  },
  leeching: {
    label: "Leeching",
    power: "normal",
    stats: { hpSteal: 1 },
    types: [...WEAPONS, "ring", "amulet", "shield"],
  },
  siphoning: {
    label: "Siphoning",
    power: "normal",
    stats: { mpSteal: 1 },
    types: [...WEAPONS, "ring", "amulet"],
  },

  /* Wards */
  flameWard: { label: "Flame Ward", power: "normal", stats: { fireResistance: 5 }, types: WORN },
  stormWard: { label: "Storm Ward", power: "normal", stats: { lightResistance: 5 }, types: WORN },
  tideWard: { label: "Tide Ward", power: "normal", stats: { waterResistance: 5 }, types: WORN },
  stoneWard: { label: "Stone Ward", power: "normal", stats: { earthResistance: 5 }, types: WORN },

  /* Percent */
  sanguine: { label: "Sanguine", power: "normal", percentStats: { maxHp: 8 }, types: JEWELRY },
  lunar: { label: "Lunar", power: "normal", percentStats: { maxMp: 8 }, types: JEWELRY },

  /* Major: they change how an item plays */
  venomous: { label: "Venomous", power: "major", triggers: onHit("debuff", "poison", 4) },
  bleeding: { label: "Bleeding", power: "major", triggers: onHit("debuff", "bleed", 3) },
  stunning: { label: "Stunning", power: "major", triggers: onHit("debuff", "stun", 10) },
  slowing: { label: "Slowing", power: "major", triggers: onHit("debuff", "slow", 4) },
  adrenal: {
    label: "Adrenal",
    power: "major",
    triggers: [{ event: "onAttackHit", type: "buff", name: "adrenaline", level: 1, chance: 15 }],
  },
  vampiric: {
    label: "Vampiric",
    power: "major",
    triggers: [{ event: "onAttackHit", type: "buff", name: "vampire", level: 1, chance: 15 }],
  },
  draining: {
    label: "Draining",
    power: "major",
    triggers: [{ event: "onAttackHit", type: "buff", name: "siphon", level: 1, chance: 15 }],
  },
  wrathful: {
    label: "Wrathful",
    power: "major",
    triggers: [{ event: "onHurt", type: "buff", name: "brute", level: 1, chance: 15 }],
  },
  elusive: {
    label: "Elusive",
    power: "major",
    triggers: [{ event: "onHurt", type: "buff", name: "evasion", level: 1, chance: 15 }],
  },
  enduring: {
    label: "Enduring",
    power: "major",
    triggers: [{ event: "onHurt", type: "buff", name: "endurance", level: 1, chance: 15 }],
  },
  fortunate: {
    label: "Fortunate",
    power: "major",
    triggers: [{ event: "onHurt", type: "buff", name: "fortune", level: 1, chance: 4 }],
  },
  regenerating: {
    label: "Regenerating",
    power: "major",
    triggers: [{ event: "onHurt", type: "buff", name: "regeneration", level: 1, chance: 30 }],
  },
  dawning: {
    label: "Dawning",
    power: "major",
    triggers: [{ event: "onHurt", type: "buff", name: "aureole", level: 1, chance: 5 }],
  },

  /* Unique: only on unique cards */
  wyrmscale: {
    label: "Wyrmscale",
    power: "major",
    triggers: [{ event: "onHurt", type: "buff", name: "guard", level: 1, chance: 10 }],
    types: ARMOR,
  },
  blooming: {
    label: "Blooming",
    power: "major",
    triggers: onHit("debuff", "poison", 12),
    types: WEAPONS,
  },
} as const satisfies Readonly<Record<string, ModDefinition>>;

export type ModName = keyof typeof MODS;

/** What a mod adds to an item of `tier`: its tier 1 values, times the tier. */
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
    percentStats: times(mod.percentStats, tier),
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

/** Every gear with mod slots: all but bags. A mod with no `types` goes on each of these. */
const SOCKETED_GEAR = ["weapon", "ranged", "shield", ...ARMOR.slice(0, -1), ...JEWELRY] as const;

/** The gear `name` can go on. */
export function modGearTypes(name: string): readonly GearType[] {
  return (MODS as Record<string, ModDefinition>)[name]?.types ?? SOCKETED_GEAR;
}

/** Whether `name` is a mod that can go on gear of `type`: what a slotted card must pass. */
export function canSlotMod(name: string, type: string): name is ModName {
  const mod: ModDefinition | undefined = (MODS as Record<string, ModDefinition>)[name];
  return !!mod && (!mod.types || (mod.types as readonly string[]).includes(type));
}
