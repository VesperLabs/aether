import { randomNumber } from "../random";
import { itemList } from "./item-scaling";

interface DropCandidate {
  type: string;
  rarity: string;
  key: string;
}

const MAX_MAGIC_FIND = 1000;

const BASE_DROP_CHANCES = [
  { rarity: "unique", chance: 2000 },
  { rarity: "rare", chance: 250 },
  { rarity: "magic", chance: 40 },
  { rarity: "common", chance: 40 },
];

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

/** Rolls a random item of a random type that is allowed to drop at this ilvl. */
export function rollDrop(ilvl: number, magicFind = 0): DropCandidate | null {
  if (magicFind >= MAX_MAGIC_FIND) magicFind = MAX_MAGIC_FIND - 1;
  const magicFindFactor = Math.min(magicFind, MAX_MAGIC_FIND) / MAX_MAGIC_FIND;

  const dropChances = BASE_DROP_CHANCES.map(({ rarity, chance }) => ({
    rarity,
    chance: Math.round(chance - chance * magicFindFactor),
  }));

  const rolls: Record<string, number> = { set: 0, unique: 0, rare: 0, magic: 0, common: 0 };

  for (const { rarity, chance } of dropChances) {
    const roll = randomNumber(1, Math.floor(chance));
    if (roll === 1) rolls[rarity] = 1;
  }

  const uniquePool: DropCandidate[] = [];
  const commonPool: DropCandidate[] = [];
  let item: DropCandidate | null = null;

  const type = DROPPABLE_TYPES[Math.floor(Math.random() * DROPPABLE_TYPES.length)];
  const theType = itemList[type];

  const addItemToPool = (pool: DropCandidate[], rarity: string, key: string) => {
    const candidate = theType[rarity][key];
    // only add items with low enough iLvl and ones
    // that aren't exclusive to a single mob to the pool
    if (candidate.ilvl <= ilvl && !candidate?.exclusive) {
      pool.push({ type, rarity, key });
    }
  };

  if (theType["unique"]) {
    Object.keys(theType["unique"]).forEach((key) => addItemToPool(uniquePool, "unique", key));
  }

  if (theType["set"]) {
    Object.keys(theType["set"]).forEach((key) => addItemToPool(uniquePool, "set", key));
  }

  if (theType["common"]) {
    Object.keys(theType["common"]).forEach((key) => addItemToPool(commonPool, "common", key));
  }

  if (rolls.unique && item == null && uniquePool.length > 0) {
    item = uniquePool[Math.floor(Math.random() * uniquePool.length)];
  }

  if (rolls.rare == 1 && item == null && commonPool.length > 0) {
    item = commonPool[Math.floor(Math.random() * commonPool.length)];
    item.rarity = "rare";
  }

  if (rolls.magic == 1 && item == null && commonPool.length > 0) {
    item = commonPool[Math.floor(Math.random() * commonPool.length)];
    item.rarity = "magic";
  }

  if (rolls.common == 1 && item == null && commonPool.length > 0) {
    item = commonPool[Math.floor(Math.random() * commonPool.length)];
    item.rarity = "common";
  }

  return item;
}
