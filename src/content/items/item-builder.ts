/* This file and Diablo II are the main reason this game exists */
import { levelPower } from "../power-curve";
import { cloneJson, type Dice } from "../random";
import { MAX_SLOTS } from "./gear-types";
import { getCatalogItem, type CatalogItem } from "./item-catalog";
import { canSlotMod, sumMods, type ModName } from "./mods";
import { rollDrop } from "./item-drops";
import { readRef, type AnyItemRef } from "./item-refs";
import type { ItemRarity } from "./item-types";
import { Item } from "./item";

type Loose = Record<string, any>;

/** Whether an item takes mod slots: made family tiers. Uniques and sets always have every slot. */
export function takesSlots(item: Pick<CatalogItem, "rarity" | "type">): boolean {
  return (
    item.rarity === "common" &&
    item.type !== "bag" &&
    item.type !== "spell" &&
    item.type !== "stackable"
  );
}

/** Gear's rarity is how many mod slots it has: none is common, 1–2 magic, 3–4 rare. */
export function rarityForSlots(slots: number): ItemRarity {
  if (slots === 0) return "common";
  return slots <= 2 ? "magic" : "rare";
}

/** How many slots an item gets when it is built with `wanted`. */
function slotCount(item: CatalogItem, wanted = 0): number {
  if (item.rarity === "unique" || item.rarity === "set") return item.type === "bag" ? 0 : MAX_SLOTS;
  return takesSlots(item) ? Math.max(0, Math.min(MAX_SLOTS, Math.floor(wanted))) : 0;
}

/**
 * Builds an item from a ref: a copy of its catalog entry with an id, an amount and its blank mod
 * slots. `null` for a key that doesn't exist.
 */
function buildItem(dice: Dice, ref: AnyItemRef, amount = 1): Item | null {
  const { key, slots } = readRef(ref);
  const found = getCatalogItem(key);
  if (!found) {
    console.log(`🔧 No item called ${key}`);
    return null;
  }

  const item: Loose = cloneJson(found);
  delete item.flavor;
  const count = slotCount(found, slots);
  if (takesSlots(found)) item.rarity = rarityForSlots(count);
  if (count) item.mods = new Array(count).fill(null);
  item.tint ??= "0xFFFFFF";
  item.amount = amount;
  item.id = item.slot === "stackable" ? key : dice.newId();
  if (item.space) item.items = new Array(item.space).fill(null);
  item.cost = getItemCost(item);
  return new Item(item);
}

/**
 * The item with these mods in its slots, its stats rebuilt from its catalog entry plus what the
 * mods add at its tier. A mod that doesn't exist or can't go on this gear leaves its slot empty.
 */
function withMods<T extends Loose>(item: T, mods: readonly (string | null | undefined)[]): T {
  const base = getCatalogItem(item.key);
  if (!base || !item.mods) return item;
  const slotted: (ModName | null)[] = item.mods.map((_: unknown, i: number) => {
    const mod = mods[i];
    return mod && canSlotMod(mod, base.type) ? mod : null;
  });
  const added = sumMods(
    slotted.filter((mod): mod is ModName => !!mod),
    base.tier,
  );
  const sum = (a: Loose = {}, b: Loose = {}) => {
    const total: Loose = { ...a };
    for (const [stat, value] of Object.entries(b)) total[stat] = (total[stat] ?? 0) + value;
    return total;
  };
  return {
    ...item,
    mods: slotted,
    stats: sum(base.stats, added.stats),
    percentStats: sum(base.percentStats, added.percentStats),
    triggers: [...(base.triggers ?? []), ...added.triggers],
  };
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

export const ItemBuilder = { rollDrop, buildItem, getItemCost, withMods };
