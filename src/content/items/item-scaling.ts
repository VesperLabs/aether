import { LEVELS_PER_POWER, levelPower } from "../power-curve";
import { itemData } from "./item-data";

/** These stats do not grow with level: speeds, reach and costs. */
const STATIC_STATS = ["attackDelay", "castDelay", "castTime", "range", "spCost"];

/** Items that have no level requirement however strong they are. */
const NO_LEVEL_REQUIREMENT_SLOTS = ["bag"];
const NO_LEVEL_REQUIREMENT_BASES = ["material"];

type Loose = Record<string, any>;

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number");
}

/** The level of a spell of this rank: rank 1 is level 1, and each rank is a step on the curve. */
function spellLevel(rank: number): number {
  return (Math.max(1, rank) - 1) * LEVELS_PER_POWER + 1;
}

/** Multiplies every scalable value in a stat block by `multiplier`. */
export function multiplyValues(obj: Loose | undefined, multiplier: number): Loose {
  const multiplied: Loose = {};
  for (const key in obj) {
    const value = obj[key];
    if (STATIC_STATS.includes(key)) {
      multiplied[key] = value;
    } else if (key === "blockChance") {
      // a chance grows by steps instead of multiplying
      multiplied[key] = isNumberPair(value)
        ? value.map((v) => v + (multiplier - 1) * 5)
        : value + (multiplier - 1) * 5;
    } else if (typeof value === "number") {
      multiplied[key] = Math.round(value * multiplier);
    } else if (isNumberPair(value)) {
      multiplied[key] = value.map((v) => Math.round(v * multiplier));
    } else {
      multiplied[key] = value;
    }
  }
  return multiplied;
}

/**
 * Fills in every item from its base: the level 1 common item with the same `base`. What the item
 * leaves out comes from the base, with the base's stats grown to the item's own level on the level
 * curve. The item's level is also the level needed to use it. Returns a copy.
 */
export function scaleBaseStats(items: Loose): Loose {
  const merged: Loose = structuredClone(items);

  for (const itemType in merged) {
    const rarities = merged[itemType];
    const commons: Loose[] = Object.values(rarities.common ?? {});

    for (const rarity in rarities) {
      for (const key in rarities[rarity]) {
        const item = rarities[rarity][key];
        if (item.rank !== undefined) item.level = spellLevel(item.rank);
        item.level = item.level ?? 1;

        const baseItem = commons.find(
          (c) => c.base === item.base && (c.level ?? spellLevel(c.rank)) === 1,
        );
        if (!baseItem) continue;

        const power = levelPower(item.level);
        const hasLevelReq =
          item.level > 1 &&
          !NO_LEVEL_REQUIREMENT_SLOTS.includes(item.slot ?? baseItem.slot) &&
          !NO_LEVEL_REQUIREMENT_BASES.includes(item.base);
        item.texture = item.texture || baseItem.texture;
        item.slot = item.slot || baseItem.slot;
        item.name = item.name || baseItem.name;
        item.flavor = item.flavor || baseItem.flavor;
        item.stats = { ...multiplyValues(baseItem.stats, power), ...item.stats };
        item.requirements = {
          ...(hasLevelReq && { level: item.level }),
          ...multiplyValues(baseItem.requirements, power),
          ...item.requirements,
        };
        item.buffs = item.buffs || multiplyValues(baseItem.buffs, power);
        item.effects = { ...multiplyValues(baseItem.effects, power), ...item.effects };
      }
    }
  }

  return merged;
}

/** Every item filled in from its base, as `itemList[type][rarity][key]`. */
export const itemList: Record<string, Record<string, Record<string, Loose>>> = scaleBaseStats(
  itemData,
);
