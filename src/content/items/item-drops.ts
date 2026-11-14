import { randomNumber, type Dice } from "../random";
import { MAX_SLOTS } from "./gear-types";
import { ITEM_CATALOG } from "./item-catalog";

/** A rolled world drop: the item, and how many blank mod slots it comes with. */
export interface WorldDrop {
  key: string;
  slots: number;
}

/** "1 in N" chance that a kill drops a random item at all. */
const WORLD_DROP_CHANCE = 18;

/**
 * How likely each kind of drop is once something drops, out of the total: gear by its number of
 * mod slots, then uniques and sets.
 */
const DROP_WEIGHTS = [
  { roll: 0, weight: 460 },
  { roll: 1, weight: 250 },
  { roll: 2, weight: 200 },
  { roll: 3, weight: 60 },
  { roll: 4, weight: 15 },
  { roll: "unique", weight: 10 },
  { roll: "set", weight: 5 },
] as const;

type DropRoll = (typeof DROP_WEIGHTS)[number]["roll"];

/** What magic find makes more likely: the rare finds, not the filler. */
const BOOSTED = new Set<DropRoll>([3, 4, "unique", "set"]);

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

/** Bonus from magic find, as a fraction: diminishing, so stacking it never guarantees uniques. */
export function magicFindBonus(magicFind: number): number {
  const mf = Math.max(0, magicFind);
  return (mf / (mf + MAGIC_FIND_HALF_POINT)) * 2;
}

/**
 * The monster levels that give `key` as a random drop, or undefined when it never drops at
 * random: not a droppable type, or kept to the monsters that list it (`exclusive`).
 */
export function randomDropLevels(key: string): { min: number; max: number } | undefined {
  const item = ITEM_CATALOG[key];
  if (!item || item.exclusive || !DROPPABLE_TYPES.includes(item.type)) return undefined;
  return { min: Math.max(1, item.level - 1), max: item.level + DROP_LEVEL_SPREAD };
}

function dropsAt(key: string, mobLevel: number): boolean {
  const levels = randomDropLevels(key);
  return !!levels && mobLevel >= levels.min && mobLevel <= levels.max;
}

function rollKind(dice: Dice, magicFind: number): DropRoll {
  const boost = 1 + magicFindBonus(magicFind);
  const weights = DROP_WEIGHTS.map(({ roll, weight }) => ({
    roll,
    weight: BOOSTED.has(roll) ? weight * boost : weight,
  }));
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let left = dice.random() * total;
  for (const { roll, weight } of weights) {
    left -= weight;
    if (left < 0) return roll;
  }
  return 0;
}

/** Keys of `type` items a monster of this level drops: uniques, sets, or everything else. */
function poolFor(type: string, kind: "unique" | "set" | "plain", mobLevel: number): string[] {
  return Object.values(ITEM_CATALOG)
    .filter((item) => item.type === type && dropsAt(item.key, mobLevel))
    .filter((item) =>
      kind === "plain" ? item.rarity !== "unique" && item.rarity !== "set" : item.rarity === kind,
    )
    .map((item) => item.key);
}

const pick = (dice: Dice, keys: string[]) => keys[randomNumber(dice, 0, keys.length - 1)];

/**
 * Rolls the random drop of a monster of `mobLevel`: whether anything drops, then what kind, then
 * an item of a random type in the monster's level range. A unique or set roll with nothing to
 * give becomes gear with 3 slots. Items that take no slots ignore the count.
 */
export function rollDrop(dice: Dice, mobLevel: number, magicFind = 0): WorldDrop | null {
  if (randomNumber(dice, 1, WORLD_DROP_CHANCE) !== 1) return null;
  const kind = rollKind(dice, magicFind);
  const type = DROPPABLE_TYPES[randomNumber(dice, 0, DROPPABLE_TYPES.length - 1)];

  if (kind === "unique" || kind === "set") {
    const special = poolFor(type, kind, mobLevel);
    if (special.length) return { key: pick(dice, special), slots: MAX_SLOTS };
  }

  const plain = poolFor(type, "plain", mobLevel);
  if (!plain.length) return null;
  return { key: pick(dice, plain), slots: typeof kind === "number" ? kind : 3 };
}
