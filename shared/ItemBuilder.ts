/* This file and Diablo II are the main reason this game exists */
import crypto from "crypto";
import Item from "../server/Item";
import { cloneObject, randomNumber } from "../server/utils";
import itemList from "./data/itemList.json";
import itemSetList from "./data/itemSetList.json";
import itemModsList from "./data/itemModsList.json";

const ItemBuilder = {
  getSetInfo: (setName: string) => {
    return itemSetList[setName];
  },
  rollDrop: (ilvl: number, magicFind = 0) => {
    const MAX_MF = 1000;
    const baseDropChances = [
      { rarity: "unique", chance: 10000 },
      { rarity: "rare", chance: 1000 },
      { rarity: "magic", chance: 100 },
      { rarity: "common", chance: 50 },
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
      "weapon",
      "helmet",
      "armor",
      "boots",
      "pants",
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
  },
  buildItem: (...args: BuildItem): any => {
    const [type, rarity, itemKey, amount] = args;

    let item: Item;
    let newStats = {};
    let newEffects = {};
    let percentStats = {}; //holds all of the % values to be calculated together after stats..

    try {
      item =
        rarity == "magic" || rarity == "rare"
          ? itemList[type]["common"][itemKey]
          : itemList[type][rarity][itemKey];
      item = cloneObject(item);
    } catch (e) {
      console.log(`🔧 Item not found for ${type} ${rarity} ${itemKey}`);
      return null;
    }

    if (!item) return console.log(`🔧 Item not found for ${type} ${rarity} ${itemKey}`);

    item = { requirements: {}, ...item };

    /* Get the baseItem */
    const commonCategory = itemList?.[type]?.["common"];
    const baseItem = Object.values(commonCategory).find(
      (i: any) => i?.base === item?.base && i.ilvl === 1
    ) as Item;

    /* Stats on all items will start with base item */
    if (baseItem) {
      for (let key in baseItem.requirements || {}) {
        item.requirements[key] = baseItem.requirements[key] * item?.ilvl;
      }
      if (item.slot !== "stackable") {
        for (let key in baseItem.stats || {}) {
          const consistentKeys = ["attackDelay", "castDelay", "range", "spCost"];
          let statAmount = 0;
          if (Array.isArray(baseItem.stats[key])) {
            const low = baseItem.stats[key][0];
            const high = baseItem.stats[key][1];
            statAmount = Math.floor(Math.random() * (high - low + 1) + low);
          } else {
            statAmount = baseItem.stats[key];
          }
          newStats[key] = consistentKeys?.includes(key) ? statAmount : statAmount * item?.ilvl;
        }
        for (let key in baseItem.effects || {}) {
          const consistentKeys = ["attackDelay", "castDelay", "range", "spCost"];
          let effectAmount = 0;
          if (Array.isArray(baseItem.effects[key])) {
            const low = baseItem.effects[key][0];
            const high = baseItem.effects[key][1];
            effectAmount = Math.floor(Math.random() * (high - low + 1) + low);
          } else {
            effectAmount = baseItem.effects[key];
          }
          newEffects[key] = consistentKeys?.includes(key)
            ? effectAmount
            : effectAmount * item?.ilvl;
        }
      }
    }

    if (item?.effects) {
      for (let key in item.effects) {
        if (Array.isArray(item.effects[key])) {
          let low = item.effects[key][0];
          let high = item.effects[key][1];
          newEffects[key] = Math.floor(Math.random() * (high - low + 1) + low);
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
          newStats[key] = Math.floor(Math.random() * (high - low + 1) + low);
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
            percentStats[key] = Math.floor(Math.random() * (high - low + 1) + low);
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

    /* Bags cannot be magic or rare */
    if (item.base === "bag") {
      if (["magic", "rare"].includes(item.rarity)) item.rarity = "common";
    }

    /* Magic and Rare Item Spawning */
    let randomMod;
    let ilvl = item.ilvl;
    let availableMods = [];
    for (var i = 0; i < itemModsList.suffix.length; i++) {
      //get all allowed mods at this ilevel
      if (ilvl >= itemModsList.suffix[i].ilvl) {
        availableMods.push(itemModsList.suffix[i]);
      }
    }

    if (item.rarity == "magic") {
      randomMod = availableMods[Math.floor(Math.random() * availableMods.length)];
      Object.keys(randomMod.stats).forEach((key) => {
        if (!item.stats[key]) {
          item.stats[key] = 0;
        }
        if (Array.isArray(randomMod.stats[key])) {
          let low = randomMod.stats[key][0] * ilvl;
          let high = randomMod.stats[key][1] * ilvl;
          item.stats[key] += Math.floor(Math.random() * (high - low + 1) + low);
        }
      });
    }

    if (item.rarity == "rare") {
      for (let i = 0; i < 3; i++) {
        randomMod = availableMods[Math.floor(Math.random() * availableMods.length)];
        Object.keys(randomMod.stats).forEach((key) => {
          if (!item.stats[key]) {
            item.stats[key] = 0;
          }
          if (Array.isArray(randomMod.stats[key])) {
            let low = randomMod.stats[key][0] * ilvl;
            let high = randomMod.stats[key][1] * ilvl;
            item.stats[key] += Math.floor(Math.random() * (high - low + 1) + low);
          }
        });
      }
    }

    item.cost = getItemCost(item);

    if (item.rarity == "magic") {
      item.name = item.name + " " + randomMod.name;
      item.key = item.key.replace("-common-", "-magic-");
    }
    if (item.rarity == "rare") {
      item.key = item.key.replace("-common-", "-rare-");
    }

    return new Item(item);
  },
};

const getItemCost = (item: Item) => {
  const ilvl = item?.ilvl || 1;
  const rarity = item?.rarity;
  if (item?.cost) return item.cost;
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
};

export default ItemBuilder;
