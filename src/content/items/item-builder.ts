/* This file and Diablo II are the main reason this game exists */
import { cloneJson, randomNumber } from "../random";
import { rollDrop } from "./item-drops";
import { itemModsList } from "./item-mods";
import { itemList, multiplyValues, scaleBaseStats } from "./item-scaling";
import { itemSetList } from "./item-sets";
import { Item } from "./item";
import { getMeleeRange } from "../assets/weapon-tips";

type Loose = Record<string, any>;

/** Only these rarities are valid for buildItem (prevents arbitrary strings + common-base relabeling). */
export const ITEM_BUILD_RARITIES = ["common", "magic", "rare", "unique", "set"] as const;
const ITEM_BUILD_RARITY_SET = new Set<string>(ITEM_BUILD_RARITIES);

export function isItemBuildRarity(r: string): boolean {
  return ITEM_BUILD_RARITY_SET.has(r);
}

/** Bags, spells and stackables never roll magic or rare mods, only their table rarities. */
const FIXED_RARITY_TYPES = new Set(["bag", "spell", "stackable"]);

/** Whether a common item of this type can be built as magic or rare. */
export function canRollRarity(type: string): boolean {
  return !FIXED_RARITY_TYPES.has(type);
}

function getSetInfo(setName: string) {
  return (itemSetList as Loose)[setName];
}

/** Rolls the `[min, max]` ranges of a stat block into fixed numbers. */
function rollRanges(block: Loose | undefined): Record<string, number> {
  const rolled: Record<string, number> = {};
  for (const key in block) {
    const value = block[key];
    rolled[key] = Array.isArray(value) ? randomNumber(value[0], value[1]) : value;
  }
  return rolled;
}

function rollPercentStats(block: Loose | undefined): Record<string, number> {
  const rolled: Record<string, number> = {};
  for (const key in block) {
    const value = block[key];
    if (typeof value == "number") {
      rolled[key] = value;
    } else if (Array.isArray(value) && typeof value[0] == "number") {
      //we have a percentage value. need to save it.
      rolled[key] = randomNumber(parseInt(String(value[0])), parseInt(String(value[1])));
    }
  }
  return rolled;
}

function findDefinition(type: string, rarity: string, itemKey: string) {
  const table = (itemList as Loose)[type];
  let shouldSpawnMods = true;
  let item: Loose | undefined;
  /*
   * Resolve by requested rarity — do not load common and then relabel as unique/set/magic/rare.
   * (Previously /drop weapon-unique-sword could spawn a common sword tagged unique.)
   */
  if (rarity === "unique") {
    item = table?.unique?.[itemKey];
    shouldSpawnMods = false;
  } else if (rarity === "set") {
    item = table?.set?.[itemKey];
    shouldSpawnMods = false;
  } else if (rarity === "common") {
    item = table?.common?.[itemKey];
  } else if (rarity === "magic" || rarity === "rare") {
    item = table?.[rarity]?.[itemKey];
    if (item) {
      shouldSpawnMods = false;
    } else {
      item = table?.common?.[itemKey];
    }
  }
  return { item, shouldSpawnMods };
}

/** `[type, rarity, key, amount?]`. Typed loosely so callers can spread stored references. */
type BuildItemArgs = string[] | [string, string, string, (number | string)?];

function buildItem(...args: BuildItemArgs): Item | null {
  const [type, rarity, itemKey, amount] = args;
  if (typeof rarity !== "string" || !isItemBuildRarity(rarity)) {
    console.log(`🔧 Unknown rarity "${rarity}" for ${type} ${itemKey}`);
    return null;
  }

  const found = findDefinition(type, rarity, itemKey);
  const shouldSpawnMods = found.shouldSpawnMods;

  if (!found.item) {
    console.log(`🔧 Item not found for ${type} ${rarity} ${itemKey}`);
    return null;
  }
  let item: Loose = cloneJson(found.item);
  item = { requirements: {}, ...item };

  // build the attributes of the item
  const newEffects = rollRanges(item.effects);
  const newStats = rollRanges(item.stats);
  const percentStats = item.percentStats ? rollPercentStats(item.percentStats) : {};

  item.key = itemKey;
  item.tint = item?.tint || "0xFFFFFF";
  item.rarity = rarity;
  item.amount = amount || 1;
  item.type = type;
  item.stats = newStats;
  /* A melee weapon reaches as far as its art: never hand-written, so it can't drift from the swing */
  if (type === "weapon") item.stats.range = getMeleeRange(item.texture);
  item.effects = newEffects;
  item.percentStats = percentStats;

  if (item.slot === "stackable") {
    item.id = itemKey;
  } else {
    item.id = globalThis.crypto.randomUUID();
  }

  /* Default slots on bags */
  if (item?.space) {
    item.items = new Array(item.space).fill(null);
  }

  /* These cannot be magic or rare unless they were found in item table */
  if (!canRollRarity(item.type) && shouldSpawnMods) {
    if (["magic", "rare"].includes(item.rarity)) item.rarity = "common";
  }

  /* Magic and Rare Item Spawning */
  if (item.rarity == "magic" && shouldSpawnMods) {
    const randomMod = rollSuffix(item, "magic");
    if (randomMod) {
      item.name = item.name + " " + randomMod.name;
      item.key = item.key.replace("-common-", "-magic-");
    }
  }

  if (item.rarity == "rare" && shouldSpawnMods) {
    for (let i = 0; i < 4; i++) {
      rollSuffix(item, "rare");
    }
    item.key = item.key.replace("-common-", "-rare-");
  }

  item.cost = getItemCost(item);

  return new Item(item);
}

function rollSuffix(item: Loose, rarity: string) {
  const ilvl = item.ilvl;
  const modSuffixes = itemModsList.suffix
    //only get suffixes ilvl or lower
    .filter((s) => ilvl >= s.ilvl)
    // suffixes only allowed on certain types
    .filter((s) => (s.types as readonly string[]).some((t) => t === "*" || t === item.type));
  const randomMod = modSuffixes[randomNumber(0, modSuffixes.length - 1)];

  if (!randomMod) return null;
  // magic items get a bit more of a buff
  const rarityBump = rarity === "magic" ? 1 : 0;
  const modStats = randomMod.stats as Loose;

  Object.keys(modStats).forEach((key) => {
    if (!item.stats[key]) {
      item.stats[key] = 0;
    }
    if (Array.isArray(modStats[key])) {
      const low = modStats[key][0] * (ilvl + rarityBump);
      const high = modStats[key][1] * (ilvl + rarityBump);
      item.stats[key] += randomNumber(low, high);
    }
  });

  return randomMod;
}

function getItemCost(item: Loose): number {
  const ilvl = item?.ilvl || 1;
  const rarity = item?.rarity;
  if (item?.cost) return item.cost;
  if (item.slot === "spell") {
    return 50 * ilvl;
  }
  if (rarity == "common") {
    if (item.slot === "stackable") {
      return 1 * ilvl;
    } else {
      return 5 * ilvl;
    }
  }
  if (rarity == "magic") {
    return 10 * ilvl;
  }
  if (rarity == "rare") {
    return 50 * ilvl;
  }
  if (rarity == "unique" || rarity == "set") {
    return 100 * ilvl;
  }
  return 1;
}

export const ItemBuilder = {
  getSetInfo,
  rollDrop,
  buildItem,
  rollSuffix,
  getItemCost,
  scaleBaseStats,
  multiplyValues,
};
