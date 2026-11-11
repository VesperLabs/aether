import { randomNumber, type Dice } from "../random";
import { itemList } from "./item-scaling";

interface DropCandidate {
  type: string;
  rarity: string;
  key: string;
}

/** "1 in N" chance that a kill drops a random item at all. */
const WORLD_DROP_CHANCE = 18;

/** How likely each rarity is once something drops, out of the total. */
const RARITY_WEIGHTS = [
  { rarity: "common", weight: 460 },
  { rarity: "magic", weight: 450 },
  { rarity: "rare", weight: 75 },
  { rarity: "set", weight: 5 },
  { rarity: "unique", weight: 10 },
] as const;

/** Rarities that magic find makes more likely: the rare finds, not the magic filler. */
const BOOSTED_RARITIES = new Set(["rare", "set", "unique"]);

/** Magic find with diminishing returns: 250 doubles the odds of rare and better; it never triples them. */
const MAGIC_FIND_HALF_POINT = 250;

/**
 * A monster drops items from 1 level above its own down to this many levels below, so low
 * items stop cluttering high areas.
 */
const DROP_LEVEL_SPREAD = 16;

const DROPPABLE_TYPES = [
  "ranged",
  "weapon",
  "helmet",
  "armor",
  "boots",
  "pants",
  "gloves",
  "shield",
  "accessory",
  "ring",
  "amulet",
  "spell",
  "bag",
];

/* Uniques and sets drop as themselves; magic and rare drops are rolled from a common base */
const POOLED_RARITIES = ["unique", "set", "common"];

/** Bonus from magic find, as a fraction: diminishing, so stacking it never guarantees uniques. */
export function magicFindBonus(magicFind: number): number {
  const mf = Math.max(0, magicFind);
  return (mf / (mf + MAGIC_FIND_HALF_POINT)) * 2;
}

/**
 * The monster levels that give `type/rarity/key` as a random drop, or undefined when it never drops
 * at random: not a droppable type, magic or rare (rolled from a common base), or kept to one
 * monster (`exclusive`).
 */
export function randomDropLevels(
  type: string,
  rarity: string,
  key: string,
): { min: number; max: number } | undefined {
  if (!DROPPABLE_TYPES.includes(type) || !POOLED_RARITIES.includes(rarity)) return undefined;
  const item = itemList[type]?.[rarity]?.[key];
  if (!item || item.exclusive) return undefined;
  return { min: Math.max(1, item.level - 1), max: item.level + DROP_LEVEL_SPREAD };
}

function dropsAt(type: string, rarity: string, key: string, mobLevel: number): boolean {
  const levels = randomDropLevels(type, rarity, key);
  return !!levels && mobLevel >= levels.min && mobLevel <= levels.max;
}

/** Picks a rarity by weight, with magic find raising rare and better. */
function rollRarity(dice: Dice, magicFind: number): string {
  const boost = 1 + magicFindBonus(magicFind);
  const weights = RARITY_WEIGHTS.map(({ rarity, weight }) => ({
    rarity,
    weight: BOOSTED_RARITIES.has(rarity) ? weight * boost : weight,
  }));
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let roll = dice.random() * total;
  for (const { rarity, weight } of weights) {
    roll -= weight;
    if (roll < 0) return rarity;
  }
  return "common";
}

/** Keys of `rarity` items of `type` a monster of this level drops. */
function poolFor(type: string, rarity: string, mobLevel: number): string[] {
  return Object.keys(itemList[type]?.[rarity] ?? {}).filter((key) =>
    dropsAt(type, rarity, key, mobLevel),
  );
}

/**
 * Rolls the random drop of a monster of `mobLevel`: whether anything drops, then one rarity, then
 * an item of a random type in the monster's level range. A unique or set roll with nothing to give
 * becomes a rare; magic and rare are common bases that roll affixes when built.
 */
export function rollDrop(dice: Dice, mobLevel: number, magicFind = 0): DropCandidate | null {
  if (randomNumber(dice, 1, WORLD_DROP_CHANCE) !== 1) return null;
  let rarity = rollRarity(dice, magicFind);
  const type = DROPPABLE_TYPES[randomNumber(dice, 0, DROPPABLE_TYPES.length - 1)];

  if (rarity === "unique" || rarity === "set") {
    const pool = poolFor(type, rarity, mobLevel);
    if (pool.length) return { type, rarity, key: pool[randomNumber(dice, 0, pool.length - 1)] };
    rarity = "rare";
  }

  const commons = poolFor(type, "common", mobLevel);
  if (!commons.length) return null;
  return { type, rarity, key: commons[randomNumber(dice, 0, commons.length - 1)] };
}
