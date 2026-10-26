import { itemData } from "./item-data";

/** ilvl * this = monster level that can drop the item. */
export const ILVL_MULTIPLIER = 8;

/** These stats do not scale with ilvl. */
const STATIC_STATS = ["attackDelay", "castDelay", "range", "spCost"];

type Loose = Record<string, any>;

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number");
}

/** Multiplies every scalable value in a stat block by `multiplier`. */
export function multiplyValues(obj: Loose | undefined, multiplier: number): Loose {
  const multiplied: Loose = {};
  for (const key in obj) {
    const value = obj[key];
    if (STATIC_STATS.includes(key)) {
      // value is in static stats, do not scale it.
      multiplied[key] = value;
    } else if (key === "blockChance") {
      // values that don't scale linear go here
      multiplied[key] = isNumberPair(value)
        ? value.map((v) => v + (multiplier - 1) * 5)
        : value + (multiplier - 1) * 5;
    } else if (typeof value === "number") {
      multiplied[key] = value * multiplier;
    } else if (isNumberPair(value)) {
      // stat is a tuple, scale both values
      multiplied[key] = value.map((v) => v * multiplier);
    } else {
      // not sure, leave it alone
      multiplied[key] = value;
    }
  }
  return multiplied;
}

/**
 * Takes in all items in the game. Looks up the base item (ilvl 1) and scales stats by ilvl for
 * each item. Returns a scaled copy; the input is not changed.
 */
export function scaleBaseStats(items: Loose): Loose {
  const merged: Loose = JSON.parse(JSON.stringify(items));

  for (const itemType in merged) {
    const itemRarities = merged[itemType];

    if (Object.prototype.hasOwnProperty.call(itemRarities, "common")) {
      // Take note of all the possible common items.
      const commonItems = itemRarities["common"];
      const commonKeys = Object.keys(commonItems);

      for (const itemRarity in itemRarities) {
        const rarityItems = itemRarities[itemRarity];

        for (const itemKey in rarityItems) {
          const item = rarityItems[itemKey];

          // The ilvl1 item we will use as a base.
          const baseItem = commonKeys
            .map((key) => commonItems[key])
            .find((commonItem) => commonItem?.base === item?.base && commonItem?.ilvl === 1);

          if (baseItem) {
            const ilvl = item?.ilvl || 1;
            const reqLevel = Math.floor((ilvl - 1) * ILVL_MULTIPLIER) - 2;
            const hasLevelReq = reqLevel > 0 && item?.slot !== "bag" && item?.base !== "material";
            item.texture = item?.texture || baseItem?.texture;
            item.slot = item?.slot || baseItem?.slot;
            item.name = item?.name || baseItem?.name;
            item.stats = { ...multiplyValues(baseItem.stats, ilvl), ...item.stats };
            item.requirements = {
              ...(hasLevelReq && { level: reqLevel }), // default required level
              ...multiplyValues(baseItem.requirements, ilvl),
              ...item.requirements,
            };
            item.buffs = item.buffs || multiplyValues(baseItem.buffs, ilvl);
            item.effects = { ...multiplyValues(baseItem.effects, ilvl), ...item.effects };
          }
        }
      }
    }
  }

  return merged;
}

/** Every item with its base stats scaled by ilvl, as `itemList[type][rarity][key]`. */
export const itemList: Record<string, Record<string, Record<string, Loose>>> = scaleBaseStats(
  itemData,
);
