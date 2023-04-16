/* This file and Diablo II are the main reason this game exists */
import crypto from "crypto";
import Item from "./Item";
import { cloneObject } from "./utils";
import itemList from "../shared/data/itemList.json";
import itemSetList from "../shared/data/itemSetList.json";
import itemModsList from "../shared/data/itemModsList.json";

const ItemBuilder = {
  getSetInfo: (setName: string) => {
    return itemSetList[setName];
  },
  rollDrop: (ilvl, magicFind = 1) => {
    if (magicFind > 100) {
      magicFind = 100;
    }
    let magicDecimal = magicFind / 100;
    let commonRoll = Math.floor(Math.random() * 20) + 1;
    let magicRoll = Math.floor(Math.random() * (5 - Math.floor(4 * magicDecimal))) + 1;
    let rareRoll = Math.floor(Math.random() * (10 - Math.floor(9 * magicDecimal))) + 1;
    let uniqueRoll = Math.floor(Math.random() * (20 - Math.floor(18 * magicDecimal))) + 1;
    let uniquePool = [];
    let commonPool = [];
    let item = null;
    //these are the types that we roll
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
    ];
    let type = types[Math.floor(Math.random() * types.length)];
    let theType = itemList[type];
    if (theType["unique"]) {
      Object.keys(theType["unique"]).forEach((key) => {
        const item = theType["unique"][key];
        if (item.ilvl == ilvl) {
          uniquePool.push({
            type: type,
            rarity: "unique",
            key: key,
            chance: 1,
          });
        }
      });
    }
    if (theType["set"]) {
      Object.keys(theType["set"]).forEach((key) => {
        const item = theType["set"][key];
        if (item.ilvl == ilvl) {
          uniquePool.push({ type: type, rarity: "set", key: key, chance: 1 });
        }
      });
    }
    if (theType["common"]) {
      Object.keys(theType["common"]).forEach((key) => {
        const item = theType["common"][key];
        if (item.ilvl == ilvl) {
          commonPool.push({
            type: type,
            rarity: "common",
            key: key,
            chance: 1,
          });
        }
      });
    }
    if (commonRoll == 1 && uniqueRoll == 1 && item == null) {
      if (uniquePool.length > 0) {
        item = uniquePool[Math.floor(Math.random() * uniquePool.length)];
      }
    }

    // todo: later support rare and magic spells
    if (type! == "spell") {
      if (commonRoll == 1 && rareRoll == 1 && item == null) {
        if (commonPool.length > 0) {
          item = commonPool[Math.floor(Math.random() * commonPool.length)];
          item.rarity = "rare";
        }
      }
      if (commonRoll == 1 && magicRoll == 1 && item == null) {
        if (commonPool.length > 0) {
          item = commonPool[Math.floor(Math.random() * commonPool.length)];
          item.rarity = "magic";
        }
      }
    }
    if (commonRoll == 1 && item == null) {
      if (commonPool.length > 0) {
        item = commonPool[Math.floor(Math.random() * commonPool.length)];
        item.rarity = "common";
      }
    }

    return item;
  },
  buildItem: (...args: BuildItem) => {
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

    if (item?.stats) {
      for (let key in item.stats) {
        if (Array.isArray(item.stats[key])) {
          let low = item.stats[key][0];
          let high = item.stats[key][1];
          newStats[key] = Math.floor(Math.random() * (high - low + 1) + low);
        } else {
          newStats[key] = item.stats[key];
        }
      } //end for
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

    if (item.setName) {
      if (itemSetList[item.setName]) {
        let setBonus = itemSetList[item.setName];
        if (setBonus.percentStats) {
          for (let key in setBonus.percentStats) {
            setBonus.percentStats[key] = parseInt(setBonus.percentStats[key]);
          }
        }
        if (setBonus.stats) {
          for (let key in setBonus.stats) {
            setBonus.stats[key] = parseInt(setBonus.stats[key]);
          }
        }
        item.setBonus = setBonus;
      }
    }

    if (item.effects) {
      newEffects = item.effects;
    }

    if (item.slot == "stackable") {
      item.id = itemKey;
    } else {
      item.id = crypto.randomUUID();
    }
    item.key = itemKey;
    item.rarity = rarity;
    item.amount = amount || 1;
    item.type = type;
    item.stats = newStats;
    item.effects = newEffects;
    item.percentStats = percentStats;

    /* Magic and Rare Item Spawning */
    let randomMod;
    let ilvl = item.ilvl;
    let availableMods = [];
    for (var i = 0; i < itemModsList.suffix.length; i++) {
      //get all mods at this ilvl
      if (ilvl == itemModsList.suffix[i].ilvl) {
        availableMods.push(itemModsList.suffix[i]);
      }
    }
    if (rarity == "magic") {
      randomMod = availableMods[Math.floor(Math.random() * availableMods.length)];
      Object.keys(randomMod.stats).forEach((key) => {
        if (!item.stats[key]) {
          item.stats[key] = 0;
        }
        if (Array.isArray(randomMod.stats[key])) {
          let low = randomMod.stats[key][0];
          let high = randomMod.stats[key][1];
          item.stats[key] += Math.floor(Math.random() * (high - low + 1) + low);
        }
      });
    }
    if (rarity == "rare") {
      for (let i = 0; i < 3; i++) {
        randomMod = availableMods[Math.floor(Math.random() * availableMods.length)];
        Object.keys(randomMod.stats).forEach((key) => {
          if (!item.stats[key]) {
            item.stats[key] = 0;
          }
          if (Array.isArray(randomMod.stats[key])) {
            let low = randomMod.stats[key][0];
            let high = randomMod.stats[key][1];
            item.stats[key] += Math.floor(Math.random() * (high - low + 1) + low);
          }
        });
      }
    }
    if (rarity == "common") {
      if (item.slot === "stackable") {
        item.cost = 1 * ilvl;
      } else {
        item.cost = 5 * ilvl;
      }
    }
    if (rarity == "magic") {
      item.name = item.name + " " + randomMod.name;
      item.cost = 10 * ilvl;
      item.key = item.key.replace("-common-", "-magic-");
    }
    if (rarity == "rare") {
      item.cost = 50 * ilvl;
      item.key = item.key.replace("-common-", "-rare-");
    }
    if (rarity == "unique" || rarity == "set") {
      item.cost = 500 * ilvl;
    }
    return new Item(item);
  },
};

export default ItemBuilder;
