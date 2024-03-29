/* This file and Diablo II are the main reason this game exists */
import crypto from "crypto";
import Item from "../server/Item";
import { cloneObject, randomNumber } from "../server/utils";
import iList from "./data/itemList.json";
import itemSetList from "./data/itemSetList.json";
import itemModsList from "./data/itemModsList.json";
import { ILVL_MULTIPLIER } from "./utils";

/* These stats do not scale with ilvl */
const STATIC_STATS = ["attackDelay", "castDelay", "range", "spCost"];

/* We scale our items based on their ilvl and whatever their base is */
export const itemList = scaleBaseStats(iList);

const getSetInfo = (setName: string) => {
  return itemSetList[setName];
};

const rollDrop = (ilvl: number, magicFind = 0) => {
  const MAX_MF = 1000;
  const baseDropChances = [
    // { rarity: "unique", chance: 10000 },
    // { rarity: "rare", chance: 1000 },
    // { rarity: "magic", chance: 100 },
    // { rarity: "common", chance: 50 },
    { rarity: "unique", chance: 2000 },
    { rarity: "rare", chance: 250 },
    { rarity: "magic", chance: 40 },
    { rarity: "common", chance: 40 },
  ];

  //magicFind = magicFind + 1000;
  if (magicFind >= MAX_MF) magicFind = MAX_MF - 1;
  const magicFindFactor = Math.min(magicFind, MAX_MF) / MAX_MF;

  const dropChances = baseDropChances.map(({ rarity, chance }) => ({
    rarity,
    chance: Math.round(chance - chance * magicFindFactor),
  }));

  const rolls = {
    set: 0,
    unique: 0,
    rare: 0,
    magic: 0,
    common: 0,
  };

  //console.log(dropChances);
  for (const dropChance of dropChances) {
    const { rarity, chance } = dropChance;
    const roll = randomNumber(1, Math.floor(chance));
    //console.log(rarity, roll);
    if (roll === 1) {
      rolls[rarity] = 1;
    }
  }

  let uniquePool = [];
  let commonPool = [];
  let item = null;

  let types = [
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

  let type = types[Math.floor(Math.random() * types.length)];
  let theType = itemList[type];

  const addItemToPool = (pool, rarity, key) => {
    const item = theType[rarity][key];
    // only add items with low enough iLvl and ones
    // that aren't exclusive to a single mob to the pool
    if (item.ilvl <= ilvl && !item?.exclusive) {
      pool.push({ type, rarity, key });
    }
  };

  if (theType["unique"]) {
    Object.keys(theType["unique"]).forEach((key) => {
      addItemToPool(uniquePool, "unique", key);
    });
  }

  if (theType["set"]) {
    Object.keys(theType["set"]).forEach((key) => {
      addItemToPool(uniquePool, "set", key);
    });
  }

  if (theType["common"]) {
    Object.keys(theType["common"]).forEach((key) => {
      addItemToPool(commonPool, "common", key);
    });
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
};

const buildItem = (...args: BuildItem): any => {
  const [type, rarity, itemKey, amount] = args;

  let shouldSpawnMods = true;
  let item: Item;
  let newStats = {};
  let newEffects = {};
  let percentStats = {};

  item = itemList?.[type]?.["common"]?.[itemKey];
  if (!item) {
    item = itemList?.[type]?.[rarity]?.[itemKey];
    if (item) {
      // if the item is found under "rare" or "magic"
      // in our itemList, the item just has a magic / rare color
      // and we do not just want to spawn mods on it
      shouldSpawnMods = false;
    }
  }
  if (!item) {
    console.log(`🔧 Item not found for ${type} ${rarity} ${itemKey}`);
    return null;
  }
  item = cloneObject(item);
  item = { requirements: {}, ...item };

  // build the attributes of the item
  if (item?.effects) {
    for (let key in item.effects) {
      if (Array.isArray(item.effects[key])) {
        let low = item.effects[key][0];
        let high = item.effects[key][1];
        newEffects[key] = randomNumber(low, high);
      } else {
        newEffects[key] = item.effects[key];
      }
    }
  }

  if (item?.stats) {
    for (let key in item.stats) {
      if (Array.isArray(item.stats[key])) {
        let low = item.stats[key][0];
        let high = item.stats[key][1];
        newStats[key] = randomNumber(low, high);
      } else {
        newStats[key] = item.stats[key];
      }
    }
  }

  if (item.percentStats) {
    for (let key in item.percentStats) {
      /* If the value is a range */
      if (typeof item.percentStats[key] == "number") {
        percentStats[key] = item.percentStats[key];
      } else if (Array.isArray(item.percentStats[key])) {
        if (typeof item.percentStats[key][0] == "number") {
          //we have a percentage value. need to save it.
          let low = parseInt(item.percentStats[key][0]);
          let high = parseInt(item.percentStats[key][1]);
          percentStats[key] = randomNumber(low, high);
        }
      }
    } //end for
  }

  item.key = itemKey;
  item.tint = item?.tint || "0xFFFFFF";
  item.rarity = rarity;
  item.amount = amount || 1;
  item.type = type;
  item.stats = newStats;
  item.effects = newEffects;
  item.percentStats = percentStats;

  if (item.slot === "stackable") {
    item.id = itemKey;
  } else {
    item.id = crypto.randomUUID();
  }

  /* Default slots on bags */
  if (item?.space) {
    item.items = new Array(item.space).fill(null);
  }

  /* Bags and Spells cannot be magic or rare unless they were found in item table */
  if (["bag", "spell"].includes(item.type) && shouldSpawnMods) {
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
};

const rollSuffix = (item, rarity) => {
  const ilvl = item.ilvl;
  const modSuffixes = itemModsList?.suffix
    //only get suffixes ilvl or lower
    ?.filter((s) => ilvl >= s.ilvl)
    // suffixes only allowed on certain types
    ?.filter((s) => s.types.includes("*") || s.types.includes(item.type));
  const randomMod = modSuffixes[randomNumber(0, modSuffixes.length - 1)];

  if (!randomMod) return null;
  // magic items get a bit more of a buff
  const rarityBump = rarity === "magic" ? 1 : 0;

  Object.keys(randomMod.stats).forEach((key) => {
    if (!item.stats[key]) {
      item.stats[key] = 0;
    }
    if (Array.isArray(randomMod.stats[key])) {
      let low = randomMod.stats[key][0] * (ilvl + rarityBump);
      let high = randomMod.stats[key][1] * (ilvl + rarityBump);
      item.stats[key] += randomNumber(low, high);
    }
  });

  return randomMod;
};

function getItemCost(item: Item) {
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

/* Takes in all items in the game. Looks up the base item (ivl 1) and scales stats by ilvl for each item  */
function scaleBaseStats(jsonData) {
  const mergedData = JSON.parse(JSON.stringify(jsonData));

  for (const itemType in mergedData) {
    const itemRarities = mergedData[itemType];

    if (itemRarities.hasOwnProperty("common")) {
      // Take note of all the possible common items.
      const commonItems = itemRarities["common"];
      const commonKeys = Object.keys(commonItems);

      for (const itemRarity in itemRarities) {
        const items = itemRarities[itemRarity];

        for (const itemKey in items) {
          const item = items[itemKey];

          // The ilvl1 item we will use as a base.
          const baseItem = commonKeys
            .map((key) => commonItems[key])
            .find((commonItem) => commonItem?.base === item?.base && commonItem?.ilvl === 1);

          // if it exists, we will use it as a base
          if (baseItem) {
            const ilvl = item?.ilvl || 1;
            const levelScale = ILVL_MULTIPLIER;
            const reqLevel = Math.floor((ilvl - 1) * levelScale) - 2;
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

  return mergedData;
}

function multiplyValues(obj, multiplier) {
  const multipliedObj = {};
  for (const key in obj) {
    const value = obj[key];
    const isNumberArray =
      Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number");
    // value is in static stats, do not scale it.
    if (STATIC_STATS.includes(key)) {
      multipliedObj[key] = value;
      // can put values that don't scale linear here...
    } else if (key === "blockChance") {
      if (isNumberArray) {
        multipliedObj[key] = value.map((v) => v + (multiplier - 1) * 5);
      } else {
        multipliedObj[key] = value + (multiplier - 1) * 5;
      }
      // stat is a number, we can scale it
    } else if (typeof value === "number") {
      multipliedObj[key] = value * multiplier;
      // stat is a tuple, scale both values
    } else if (isNumberArray) {
      multipliedObj[key] = value.map((v) => v * multiplier);
      // not sure, leave it alone
    } else {
      multipliedObj[key] = value;
    }
  }
  return multipliedObj;
}

const ItemBuilder = {
  getSetInfo,
  rollDrop,
  buildItem,
  rollSuffix,
  getItemCost,
  scaleBaseStats,
  multiplyValues,
};

export default ItemBuilder;
