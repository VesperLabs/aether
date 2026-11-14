import { getMeleeRange } from "../assets/weapon-tips";
import { tierLevel } from "../power-curve";
import { gearFamilies, gearUniques } from "./gear-data";
import {
  MAX_SLOTS,
  type FamilyDefinition,
  type GearType,
  type UniqueDefinition,
} from "./gear-types";
import { itemSetList } from "./item-sets";
import type { ItemDefinition, ItemRarity } from "./item-types";
import { readRef, type AnyItemRef } from "./item-refs";
import { sumMods, type ModName } from "./mods";
import { cardItems } from "./card";
import { spellItems } from "./spell";
import { stackableItems } from "./stackable";

type Loose = Record<string, any>;

/**
 * An item as the game knows it before it is built: its stats with nothing slotted, at its tier.
 * A built item is a copy of this with an id, an amount and its blank mod slots.
 */
export interface CatalogItem {
  key: string;
  type: string;
  /** The family's for gear, the table's for everything else. Common gear rolls its own on drop. */
  rarity: ItemRarity;
  tier: number;
  level: number;
  /** Spells only: their rank, the same as their tier. */
  rank?: number;
  /** The family for gear; the item's kind (`food`, `fireball`) for the rest. */
  base: string;
  name: string;
  flavor?: string;
  slot: string;
  texture: string;
  tint?: string;
  stats: Loose;
  percentStats?: Loose;
  effects?: Loose;
  requirements: Loose;
  buffs?: Loose;
  triggers?: Loose[];
  /** Cards only: the mod the card puts in a slot. */
  mod?: ModName;
  /** A unique's or set piece's own mod, already in its stats. */
  fixedMod?: ModName;
  /** A unique's or set piece's slots, always empty here. Common gear gets its own when built. */
  mods?: null[];
  setName?: string;
  space?: number;
  cost?: number;
  exclusive?: boolean;
}

/** These stats are the same at every tier: speeds, reach, costs and chances. */
const STATIC_STATS = new Set([
  "attackDelay",
  "castDelay",
  "castTime",
  "range",
  "spCost",
  "blockChance",
]);

const SLOT_OF: Partial<Record<GearType, string>> = {
  weapon: "hands",
  ranged: "hands",
  shield: "hands",
};

function scale(block: Loose | undefined, tier: number): Loose {
  const scaled: Loose = {};
  for (const [stat, value] of Object.entries(block ?? {})) {
    const grows = typeof value === "number" && !STATIC_STATS.has(stat);
    scaled[stat] = grows ? Math.round(value * tier) : value;
  }
  return scaled;
}

function add(into: Loose, from: Loose) {
  for (const [stat, value] of Object.entries(from)) into[stat] = (into[stat] ?? 0) + value;
  return into;
}

/** A family's base at `tier`, with `look` on top and an optional fixed mod added in. */
function gearItem(
  key: string,
  familyKey: string,
  tier: number,
  look: Pick<UniqueDefinition, "name" | "flavor" | "texture" | "tint" | "mod" | "exclusive">,
  rarity: ItemRarity,
): CatalogItem {
  const family: FamilyDefinition = gearFamilies[familyKey as keyof typeof gearFamilies];
  const level = tierLevel(tier);
  const texture = look.texture ?? family.texture;
  const mod = look.mod ? sumMods([look.mod], tier) : undefined;
  const stats = add(scale(family.stats, tier), mod?.stats ?? {});
  /* A melee weapon reaches as far as its art: never hand-written, so it can't drift from the swing */
  if (family.type === "weapon") stats.range = getMeleeRange(texture);
  const isBag = family.type === "bag";

  return {
    key,
    type: family.type,
    rarity,
    tier,
    level,
    base: familyKey,
    name: look.name,
    flavor: look.flavor,
    slot: SLOT_OF[family.type] ?? family.type,
    texture,
    tint: look.tint,
    stats,
    percentStats: mod?.percentStats,
    effects: scale(family.effects, tier),
    requirements: {
      ...(level > 1 && !isBag && { level }),
      ...scale(family.requirements, tier),
    },
    triggers: mod?.triggers,
    fixedMod: look.mod,
    mods: look.mod ? new Array(MAX_SLOTS).fill(null) : undefined,
    space: family.space && family.space * tier,
    exclusive: look.exclusive,
  };
}

function* gear(): Generator<CatalogItem> {
  for (const [familyKey, family] of Object.entries(gearFamilies)) {
    const rarity = family.type === "bag" ? "rare" : "common";
    for (const [index, tier] of family.tiers.entries()) {
      if (tier) yield gearItem(tier.key, familyKey, index + 1, tier, rarity);
    }
  }
  for (const [key, unique] of Object.entries(gearUniques) as [string, UniqueDefinition][]) {
    yield gearItem(key, unique.family, unique.tier, unique, "unique");
  }
  for (const [setName, set] of Object.entries(itemSetList)) {
    for (const [key, piece] of Object.entries(set.pieces)) {
      yield { ...gearItem(key, piece.family, set.tier, piece, "set"), setName };
    }
  }
}

/**
 * Stackables and spells, from tables by rarity. A tier above 1 copies the tier 1 item of the same
 * base, with its stats times the tier, so `fireball2` only writes what makes it Fireball 2.
 */
function* tabled(type: string, table: Partial<Record<ItemRarity, Loose>>): Generator<CatalogItem> {
  const firsts = Object.values(table.common ?? {}).filter((item) => (item.tier ?? 1) === 1);
  for (const [rarity, items] of Object.entries(table) as [ItemRarity, Loose][]) {
    for (const [key, own] of Object.entries(items) as [string, ItemDefinition][]) {
      const tier = own.tier ?? 1;
      const first: Loose = firsts.find((item) => item.base === own.base) ?? {};
      const level = tierLevel(tier);
      const needsLevel = level > 1 && own.base !== "material";
      yield {
        ...own,
        key,
        type,
        rarity,
        tier,
        level,
        ...(type === "spell" && { rank: tier }),
        name: own.name ?? first.name,
        flavor: own.flavor ?? first.flavor,
        slot: own.slot ?? first.slot,
        texture: own.texture ?? first.texture,
        stats: { ...scale(first.stats, tier), ...own.stats },
        effects: { ...scale(first.effects, tier), ...own.effects },
        buffs: own.buffs ?? scale(first.buffs, tier),
        requirements: {
          ...(needsLevel && { level }),
          ...scale(first.requirements, tier),
          ...own.requirements,
        },
      } as CatalogItem;
    }
  }
}

/** Every item in the game, by key. Keys are unique across every type. */
export const ITEM_CATALOG: Readonly<Record<string, CatalogItem>> = Object.fromEntries(
  [
    ...gear(),
    ...tabled("stackable", stackableItems),
    ...tabled("stackable", cardItems),
    ...tabled("spell", spellItems),
  ].map((item) => [item.key, item]),
);

/** The catalog item a key or ref names. */
export const getCatalogItem = (ref: AnyItemRef): CatalogItem | undefined =>
  ITEM_CATALOG[readRef(ref).key];
