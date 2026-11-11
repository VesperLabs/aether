/* This file and Diablo II are the main reason this game exists */
import { levelPower, tierLevel } from "../power-curve";
import { cloneJson, randomNumber, type Dice } from "../random";
import { getMeleeRange } from "../assets/weapon-tips";
import { AFFIXES, type AffixDefinition } from "./item-affixes";
import { rollDrop } from "./item-drops";
import { itemList, multiplyValues, scaleBaseStats } from "./item-scaling";
import { itemSetList } from "./item-sets";
import { Item } from "./item";

type Loose = Record<string, any>;

/** Only these rarities are valid for buildItem (prevents arbitrary strings + common-base relabeling). */
export const ITEM_BUILD_RARITIES = ["common", "magic", "rare", "unique", "set"] as const;
const ITEM_BUILD_RARITY_SET = new Set<string>(ITEM_BUILD_RARITIES);

export function isItemBuildRarity(r: string): boolean {
  return ITEM_BUILD_RARITY_SET.has(r);
}

/** Bags, spells and stackables never roll magic or rare affixes, only their table rarities. */
const FIXED_RARITY_TYPES = new Set(["bag", "spell", "stackable"]);

/** Whether a common item of this type can be built as magic or rare. */
export function canRollRarity(type: string): boolean {
  return !FIXED_RARITY_TYPES.has(type);
}

/** How many affixes each rarity rolls, and at most how many of each kind. */
const AFFIX_COUNTS = {
  magic: { min: 1, max: 2, perKind: 1 },
  rare: { min: 4, max: 5, perKind: 3 },
} as const;

function getSetInfo(setName: string) {
  return (itemSetList as Loose)[setName];
}

/** Rolls the `[min, max]` ranges of a stat block into fixed numbers. */
function rollRanges(dice: Dice, block: Loose | undefined): Record<string, number> {
  const rolled: Record<string, number> = {};
  for (const key in block) {
    const value = block[key];
    rolled[key] = Array.isArray(value) ? randomNumber(dice, value[0], value[1]) : value;
  }
  return rolled;
}

/**
 * The item a `[type, rarity, key]` ref names and the rarity table it is written in. A magic or rare
 * ref with no hand-written version is the common item, rolled with affixes when built.
 */
export function findDefinition(type: string, rarity: string, itemKey: string) {
  const table = itemList[type];
  const own = table?.[rarity]?.[itemKey];
  if (own) return { item: own, rollsAffixes: false, definedRarity: rarity };
  if (rarity === "magic" || rarity === "rare") {
    const item = table?.common?.[itemKey];
    return { item, rollsAffixes: canRollRarity(type), definedRarity: "common" };
  }
  return { item: undefined, rollsAffixes: false, definedRarity: rarity };
}

/** `[type, rarity, key, amount?]`. Typed loosely so callers can spread stored references. */
type BuildItemArgs = string[] | [string, string, string, (number | string)?];

function buildItem(dice: Dice, ...args: BuildItemArgs): Item | null {
  const [type, requestedRarity, itemKey, amount] = args;
  if (typeof requestedRarity !== "string" || !isItemBuildRarity(requestedRarity)) {
    console.log(`🔧 Unknown rarity "${requestedRarity}" for ${type} ${itemKey}`);
    return null;
  }

  const found = findDefinition(type, requestedRarity, itemKey);
  if (!found.item) {
    console.log(`🔧 Item not found for ${type} ${requestedRarity} ${itemKey}`);
    return null;
  }
  // A bag or potion asked for as magic is just the common one
  const rarity =
    found.definedRarity !== requestedRarity && !found.rollsAffixes ? "common" : requestedRarity;

  const item: Loose = { requirements: {}, ...cloneJson(found.item) };
  delete item.flavor;
  item.key = itemKey;
  item.tint = item.tint || "0xFFFFFF";
  item.rarity = rarity;
  item.amount = amount || 1;
  item.type = type;
  item.stats = rollRanges(dice, item.stats);
  item.effects = rollRanges(dice, item.effects);
  item.percentStats = rollRanges(dice, item.percentStats);
  /* A melee weapon reaches as far as its art: never hand-written, so it can't drift from the swing */
  if (type === "weapon") item.stats.range = getMeleeRange(item.texture);
  item.id = item.slot === "stackable" ? itemKey : dice.newId();
  if (item.space) item.items = new Array(item.space).fill(null);

  if (found.rollsAffixes && (rarity === "magic" || rarity === "rare")) {
    rollAffixes(dice, item, AFFIX_COUNTS[rarity]);
  }

  item.cost = getItemCost(item);
  return new Item(item);
}

/** What an affix's level 1 values are multiplied by on an item of this level. */
function affixMultiplier(affix: AffixDefinition, level: number): number {
  if (affix.scale === "none") return 1;
  const power = levelPower(level);
  return affix.scale === "half" ? 1 + (power - 1) / 2 : power;
}

/**
 * Rolls `count` affixes onto a built item from those its type and level allow. No two affixes
 * share a stat. A magic item is named after its affixes ("Sharp Dagger of Haste").
 */
function rollAffixes(
  dice: Dice,
  item: Loose,
  count: { min: number; max: number; perKind: number },
) {
  const wanted = randomNumber(dice, count.min, count.max);
  const usedStats = new Set<string>();
  const perKind = { prefix: 0, suffix: 0 };
  const rolled: AffixDefinition[] = [];

  for (let i = 0; i < wanted; i++) {
    const pool = (AFFIXES as readonly AffixDefinition[]).filter(
      (a) =>
        tierLevel(a.tier) <= item.level &&
        (a.types as readonly string[]).includes(item.type) &&
        perKind[a.kind] < count.perKind &&
        Object.keys(a.stats).every((stat) => !usedStats.has(stat)),
    );
    if (!pool.length) break;
    const affix = pool[randomNumber(dice, 0, pool.length - 1)];
    const multiplier = affixMultiplier(affix, item.level);
    for (const [stat, range] of Object.entries(affix.stats) as [string, readonly number[]][]) {
      const low = Math.round(range[0] * multiplier * 100) / 100;
      const high = Math.round(range[1] * multiplier * 100) / 100;
      const value =
        Number.isInteger(low) && Number.isInteger(high) ? randomNumber(dice, low, high) : low;
      item.stats[stat] = (item.stats[stat] ?? 0) + value;
      usedStats.add(stat);
    }
    perKind[affix.kind]++;
    rolled.push(affix);
  }

  item.affixes = rolled.map((a) => a.name);
  if (item.rarity === "magic") {
    const prefix = rolled.find((a) => a.kind === "prefix")?.name;
    const suffix = rolled.find((a) => a.kind === "suffix")?.name;
    item.name = [prefix, item.name, suffix].filter(Boolean).join(" ");
  }
}

/** What a merchant pays: grows with the item's level and its rarity. */
const RARITY_VALUE: Record<string, number> = {
  common: 5,
  magic: 10,
  rare: 50,
  unique: 100,
  set: 100,
};

function getItemCost(item: Loose): number {
  if (item?.cost) return item.cost;
  const power = levelPower(item?.level ?? 1);
  if (item.slot === "spell") return Math.round(50 * power);
  if (item.slot === "stackable") return Math.round(power);
  return Math.round((RARITY_VALUE[item?.rarity] ?? 1) * power);
}

export const ItemBuilder = {
  getSetInfo,
  rollDrop,
  buildItem,
  getItemCost,
  scaleBaseStats,
  multiplyValues,
};
