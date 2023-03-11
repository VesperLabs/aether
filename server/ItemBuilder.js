/* This file and Diablo II are the main reason this game exists */
import { ObjectId } from "mongodb";
import Item from "./Item.js";
const _itemList = {
  weapon: {
    common: {
      "common-katar": {
        ilvl: 1,
        name: "Katar",
        texture: "weapon-katar",
        slot: "hands",
        stats: {
          attackSpeed: 10,
          armorPierce: 5,
          minDamage: 0,
          maxDamage: 3,
          range: 1,
        },
      },
      "common-spade": {
        ilvl: 1,
        name: "Spade",
        texture: "weapon-spade",
        slot: "hands",
        stats: {
          attackSpeed: 60,
          armorPierce: 5,
          minDamage: 1,
          maxDamage: 2,
          range: 1,
        },
      },
      "common-sword": {
        ilvl: 1,
        name: "Sword",
        texture: "weapon-sword-short",
        slot: "hands",
        stats: {
          attackSpeed: 100,
          minDamage: 2,
          maxDamage: 2,
          range: 1,
        },
      },
      "common-hammer": {
        ilvl: 1,
        name: "Hammer",
        texture: "weapon-hammer",
        slot: "hands",
        stats: {
          attackSpeed: 300,
          minDamage: 2,
          maxDamage: 3,
          range: 1,
        },
      },
      "common-axe": {
        ilvl: 1,
        name: "Axe",
        texture: "weapon-axe",
        slot: "hands",
        stats: {
          attackSpeed: 250,
          minDamage: 2,
          maxDamage: 3,
          range: 1,
        },
      },
      "common-sword-gladius": {
        ilvl: 2,
        name: "Gladius",
        texture: "weapon-gladius",
        slot: "hands",
        requirements: {
          level: 10,
        },
        stats: {
          attackSpeed: 250,
          minDamage: 5,
          maxDamage: 5,
          range: 1,
        },
      },
      "common-scythe": {
        ilvl: 1,
        name: "Scythe",
        texture: "weapon-scythe",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          attackSpeed: 150,
          minDamage: 1,
          maxDamage: 3,
          range: 1,
        },
      },
      "common-spear": {
        ilvl: 1,
        name: "Spear",
        texture: "weapon-spear",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          attackSpeed: 500,
          minDamage: 4,
          maxDamage: 4,
          range: 2,
        },
      },
    },
    unique: {
      "unique-sword-whistler": {
        ilvl: 1,
        name: "Dark Whistler",
        texture: "weapon-sword-short",
        slot: "hands",
        stats: {
          attackSpeed: 100,
          minDamage: 4,
          maxDamage: 4,
          critChance: 5,
          range: 1,
        },
      },
      "unique-claymore-soul": {
        ilvl: 2,
        name: "Soul Edge",
        texture: "weapon-claymore-soul",
        slot: "hands",
        stats: {
          attackSpeed: 350,
          minDamage: 8,
          maxDamage: 8,
          critChance: 5,
          range: 2,
        },
      },
    },
    set: {
      "set-scythe-pincher": {
        ilvl: 1,
        set: "hawkwings",
        name: "Hawkwing's Pincher",
        texture: "weapon-scythe",
        tint: "0x55FF55",
        slot: "hands",
        requirements: {
          level: 5,
        },
        stats: {
          attackSpeed: 150,
          minDamage: 3,
          maxDamage: 5,
          range: 1,
        },
      },
      "set-scythe-tickler": {
        ilvl: 1,
        set: "hawkwings",
        name: "Hawkwing's Tickler",
        texture: "weapon-scythe",
        tint: "0x5588FF",
        slot: "hands",
        requirements: {
          level: 5,
        },
        stats: {
          attackSpeed: 150,
          minDamage: 3,
          maxDamage: 5,
          range: 1,
        },
      },
    },
  },
  helmet: {
    common: {
      "common-cap-colloquial": {
        ilvl: 1,
        name: "Colloquial Cap",
        texture: "helmet-cap",
        tint: "0x865027",
        slot: "helmet",
        stats: {
          defense: 3,
        },
      },
      "common-cap-cloth": {
        ilvl: 1,
        name: "Cloth Cap",
        texture: "helmet-cap",
        tint: "0xFFDDCC",
        slot: "helmet",
        stats: {
          defense: 3,
        },
      },
    },
    unique: {
      "unique-cap-tudwick": {
        ilvl: 1,
        name: "Tudwick's Cap",
        texture: "helmet-cap-raccoon",
        slot: "helmet",
        stats: {
          defense: 5,
          speed: [8, 10],
          dodgeChance: [2, 3],
          critChance: [4, 5],
          vitality: [3, 5],
        },
      },
    },
    set: {},
  },
  armor: {
    common: {
      "common-plate-nutshell": {
        ilvl: 1,
        name: "Nutshell Plate",
        texture: "armor-light-plate",
        tint: "0xCC9966",
        slot: "armor",
        stats: {
          defense: 5,
        },
      },
      "common-robe-cloth": {
        ilvl: 1,
        name: "Cloth Robe",
        texture: "armor-robe",
        tint: "0xFFDDCC",
        slot: "armor",
        stats: {
          defense: 3,
        },
      },
      "common-plate-bronze": {
        ilvl: 2,
        name: "Bronze Plate",
        texture: "armor-light-plate",
        tint: "0xFFCCAA",
        slot: "armor",
        requirements: {
          level: 10,
        },
        stats: {
          defense: 8,
        },
      },
      "common-heavyplate-bronze": {
        ilvl: 2,
        name: "Bronze Heavy Plate",
        texture: "armor-plate",
        tint: "0xFFCCAA",
        slot: "armor",
        requirements: {
          level: 10,
        },
        stats: {
          defense: 10,
          speed: -5,
        },
      },
      "common-robe-wizard": {
        ilvl: 3,
        name: "Wizard Robe",
        texture: "armor-wizard",
        tint: "0xFFFFFF",
        slot: "armor",
        requirements: {
          level: 20,
        },
        stats: {
          defense: 3,
        },
      },
    },
    unique: {
      "unique-robe-mossman": {
        ilvl: 1,
        name: "The Mossman Prophecy",
        texture: "armor-robe",
        tint: "0x66AA66",
        slot: "armor",
        stats: {
          dodgeChance: 2,
          speed: 10,
          defense: 5,
          vitality: [5, 10],
          intelligence: [5, 10],
          regenHp: 5,
        },
        percentStats: {
          regenHp: "15%",
        },
      },
    },
    set: {
      "set-robe-chets": {
        ilvl: 1,
        set: "chets",
        name: "Chet's Purple Shirt",
        texture: "armor-robe",
        tint: "0x8800FF",
        slot: "armor",
        requirements: {
          level: 6,
        },
        stats: {
          defense: 3,
          vitality: [5, 10],
          regenHp: [1, 3],
        },
      },
    },
  },
  boots: {
    common: {
      "common-boots-nutshell": {
        ilvl: 1,
        name: "Nutshell Boots",
        texture: "boots-cloth",
        tint: "0xCC9966",
        slot: "boots",
        stats: {
          speed: 5,
          defense: 1,
        },
      },
      "common-boots-leather": {
        ilvl: 2,
        name: "Leather Boots",
        texture: "boots-cloth",
        tint: "0x865027",
        slot: "boots",
        stats: {
          speed: 10,
          defense: 4,
        },
      },
    },
    set: {
      "set-boots-chets": {
        ilvl: 1,
        set: "chets",
        name: "Chet's Neon Kicks",
        texture: "boots-cloth",
        tint: "0x00FF00",
        slot: "boots",
        requirements: {
          level: 6,
        },
        stats: {
          vitality: [8, 10],
          speed: [15, 20],
          defense: [3, 5],
        },
      },
    },
  },
  pants: {
    common: {
      "common-pants-cloth": {
        ilvl: 1,
        name: "Cloth Pants",
        texture: "pants-cloth",
        tint: "0xFFDDCC",
        slot: "pants",
        stats: {
          defense: 3,
        },
      },
      "common-pants-leather": {
        ilvl: 2,
        name: "Leather Pants",
        texture: "pants-cloth",
        tint: "0x865027",
        slot: "pants",
        requirements: {
          level: 10,
        },
        stats: {
          defense: 6,
        },
      },
    },
    set: {
      "set-pants-chets": {
        ilvl: 1,
        set: "chets",
        name: "Chet's Champions",
        texture: "pants-cloth",
        tint: "0x3333EE",
        slot: "pants",
        requirements: {
          level: 6,
        },
        stats: {
          defense: 3,
          vitality: [5, 10],
        },
      },
    },
  },
  shield: {
    common: {
      "common-shield-bark": {
        ilvl: 1,
        name: "Bark Blocker",
        texture: "shield-broken",
        tint: "0x865027",
        slot: "hands",
        stats: {
          defense: 5,
          blockChance: 5,
        },
      },
      "common-shield-buckler": {
        ilvl: 2,
        name: "Buckler",
        texture: "shield-buckler",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          defense: 10,
          blockChance: 10,
        },
      },
    },
    unique: {
      "unique-shield-round": {
        ilvl: 2,
        name: "Round Stage",
        texture: "shield-round",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          critChance: [4, 5],
          attackSpeed: -20,
          strength: [8, 10],
          vitality: [8, 10],
          defense: [15, 20],
          blockChance: [20, 25],
        },
        percentStats: {
          maxHp: "5%",
        },
      },
    },
  },
  accessory: {
    common: {
      "common-glasses": {
        ilvl: 1,
        name: "Glasses",
        texture: "accessory-glasses",
        tint: "0xFFFFFF",
        slot: "accessory",
        stats: {
          accuracy: 1,
        },
      },
    },
    unique: {
      "unique-glasses-compound": {
        ilvl: 1,
        name: "Compound Lenses",
        texture: "accessory-glasses",
        tint: "0xFF6666",
        slot: "accessory",
        stats: {
          accuracy: 5,
          critChance: [2, 3],
          dodgeChance: [1, 2],
          speed: [1, 2],
          intelligence: [5, 6],
        },
      },
    },
  },
  ring: {
    common: {
      "common-ring-silver": {
        ilvl: 1,
        name: "Silver Ring",
        texture: "ring-silver-plain",
        tint: "0xFFFFFF",
        slot: "ring",
        stats: {
          defense: 1,
        },
      },
      "common-ring-gold": {
        ilvl: 2,
        name: "Gold Ring",
        texture: "ring-gold-plain",
        tint: "0xFFFFFF",
        slot: "ring",
        stats: {
          defense: 5,
        },
      },
    },
    set: {
      "set-ring-timmys": {
        ilvl: 2,
        set: "timmys",
        name: "Timmy's Signet",
        texture: "ring-silver-sapphire",
        tint: "0xFFFFFF",
        slot: "ring",
        requirements: {
          level: 10,
        },
        stats: {
          defense: 5,
        },
      },
    },
    unique: {
      "unique-ring-blood": {
        ilvl: 2,
        name: "Blood Music",
        texture: "ring-silver-ruby",
        tint: "0xFFFFFF",
        slot: "ring",
        requirements: {
          level: 10,
        },
        stats: {
          regenHp: [4, 5],
          maxHp: [15, 20],
        },
        percentStats: {
          maxHp: ["10%", "15%"],
        },
      },
    },
  },
  amulet: {
    common: {
      "common-amulet-silver": {
        ilvl: 1,
        name: "Silver Amulet",
        texture: "amulet-silver-plain",
        tint: "0xFFFFFF",
        slot: "amulet",
        stats: {
          defense: 1,
        },
      },
      "common-amulet-gold": {
        ilvl: 2,
        name: "Gold Amulet",
        texture: "amulet-gold-plain",
        tint: "0xFFFFFF",
        slot: "amulet",
        stats: {
          defense: 5,
        },
      },
    },
    set: {
      "set-amulet-timmys": {
        ilvl: 2,
        set: "timmys",
        name: "Timmy's Chain",
        texture: "amulet-gold-plain",
        tint: "0xFFFFFF",
        slot: "amulet",
        requirements: {
          level: 10,
        },
        stats: {
          defense: 5,
        },
      },
    },
  },
  stackable: {
    common: {
      "common-stackable-potionsmallhp": {
        ilvl: 1,
        name: "Small HP Potion",
        slot: "stackable",
        texture: "stackable-potion-small-hp",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          hp: 25,
        },
      },
      "common-stackable-potionsmallmp": {
        ilvl: 1,
        name: "Small MP Potion",
        slot: "stackable",
        texture: "stackable-potion-small-mp",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          mp: 25,
        },
      },
      "common-stackable-potionmediumhp": {
        ilvl: 1,
        name: "Medium HP Potion",
        slot: "stackable",
        texture: "stackable-potion-medium-hp",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          hp: 50,
        },
      },
      "common-stackable-potionmediummp": {
        ilvl: 1,
        name: "Medium MP Potion",
        slot: "stackable",
        texture: "stackable-potion-medium-mp",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          mp: 50,
        },
      },
      "common-stackable-bsporangium": {
        ilvl: 1,
        name: "Blue Sporangium",
        slot: "stackable",
        texture: "stackable-bsporangium",
        tint: "0x6666FF",
        type: "stackable",
        effects: {
          hp: 15,
        },
      },
      "common-stackable-apple": {
        ilvl: 1,
        name: "Red Apple",
        slot: "stackable",
        texture: "stackable-apple",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          hp: 20,
        },
      },
      "common-stackable-batmeat": {
        ilvl: 1,
        name: "Bat Meat",
        slot: "stackable",
        texture: "stackable-meat",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          hp: 30,
        },
      },
      "common-stackable-spidermeat": {
        ilvl: 1,
        name: "Spider Meat",
        slot: "stackable",
        texture: "stackable-meat",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          hp: 30,
        },
      },
      "common-stackable-cheese": {
        ilvl: 1,
        name: "Cheese",
        slot: "stackable",
        texture: "stackable-cheese",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          hp: 25,
        },
      },
      "common-stackable-grapes": {
        ilvl: 1,
        name: "Grapes",
        slot: "stackable",
        texture: "stackable-grapes",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {
          hp: 20,
        },
      },
      "common-stackable-skull": {
        ilvl: 2,
        name: "Skull",
        slot: "stackable",
        texture: "stackable-skull",
        tint: "0xFFFFFF",
        type: "stackable",
        effects: {},
      },
    },
  },
};

const _setList = {
  chets: {
    pieces: 3,
    stats: {
      vitality: 10,
      intelligence: 10,
    },
    percentStats: {
      vitality: "15%",
      intelligence: "15%",
    },
  },
  hawkwings: {
    pieces: 2,
    stats: {
      dexterity: 10,
      speed: 10,
      dodgeChance: 10,
    },
    percentStats: {
      dexterity: "15%",
    },
  },
  timmys: {
    pieces: 2,
    stats: {
      strength: 10,
      speed: 5,
      dodgeChance: 5,
      critChance: 5,
      critMultiplier: 1,
    },
    percentStats: {},
  },
};

const _modsList = {
  suffix: [
    { ilvl: 1, name: "of Dexterity", stats: { dexterity: [2, 3] } },
    { ilvl: 1, name: "of Strength", stats: { strength: [2, 3] } },
    { ilvl: 1, name: "of Vitality", stats: { vitality: [2, 3] } },
    { ilvl: 1, name: "of Intelligence", stats: { intelligence: [2, 3] } },
    { ilvl: 1, name: "of Critical Chance", stats: { critChance: [1, 2] } },
    { ilvl: 1, name: "of Dodge Chance", stats: { dodgeChance: [1, 2] } },
    { ilvl: 1, name: "of HP Regen", stats: { regenHp: [1, 2] } },
    { ilvl: 1, name: "of Magic Find", stats: { magicFind: [1, 2] } },
    { ilvl: 1, name: "of Max Damage", stats: { maxDamage: [1, 2] } },
    { ilvl: 1, name: "of Spell Damage", stats: { spellDamage: [1, 1] } },

    { ilvl: 2, name: "of Dexterity", stats: { dexterity: [6, 8] } },
    { ilvl: 2, name: "of Strength", stats: { strength: [6, 8] } },
    { ilvl: 2, name: "of Vitality", stats: { vitality: [6, 8] } },
    { ilvl: 2, name: "of Intelligence", stats: { intelligence: [6, 8] } },
    { ilvl: 2, name: "of HP Regen", stats: { regenHp: [2, 4] } },
    { ilvl: 2, name: "of Critical Chance", stats: { critChance: [2, 3] } },
    { ilvl: 2, name: "of Dodge Chance", stats: { dodgeChance: [2, 3] } },
    { ilvl: 2, name: "of Magic Find", stats: { magicFind: [2, 3] } },
    { ilvl: 2, name: "of Max Damage", stats: { maxDamage: [2, 3] } },
    { ilvl: 2, name: "of Spell Damage", stats: { spellDamage: [1, 2] } },
  ],
};

const ItemBuilder = {
  getSetInfo: (setName) => {
    return _setList[setName];
  },
  rollDrop: (ilvl, magicFind) => {
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
    ];
    let type = types[Math.floor(Math.random() * types.length)];
    let theType = _itemList[type];
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
    if (commonRoll == 1 && item == null) {
      if (commonPool.length > 0) {
        item = commonPool[Math.floor(Math.random() * commonPool.length)];
        item.rarity = "common";
      }
    }
    return item;
  },
  buildItem: (type, rarity, itemKey, amount) => {
    let item;
    if (rarity == "magic" || rarity == "rare") {
      item = _itemList[type]["common"][itemKey];
    } else {
      item = _itemList[type][rarity][itemKey];
    }
    let newStats = {};
    let newEffects = {};
    // ToDo: needs better error handling. invalid item builds break the server.
    /* Select an item of the type and rarity (if more than one exist) */

    item = JSON.parse(JSON.stringify(item));
    let percentStats = {}; //holds all of the % values to be calculated together after stats..

    if (item.stats) {
      for (let key in item.stats) {
        if (Number.isInteger(item.stats[key])) {
          newStats[key] = item.stats[key];
        } else if (Array.isArray(item.stats[key])) {
          let low = item.stats[key][0];
          let high = item.stats[key][1];
          newStats[key] = Math.floor(Math.random() * (high - low + 1) + low);
        }
      } //end for
    }

    if (item.percentStats) {
      for (let key in item.percentStats) {
        /* If the value is a range */
        if (typeof item.percentStats[key] == "string") {
          percentStats[key] = parseInt(parseFloat(item.percentStats[key]));
        } else if (Array.isArray(item.percentStats[key])) {
          if (typeof item.percentStats[key][0] == "string") {
            //we have a percentage value. need to save it.
            let low = parseInt(parseFloat(item.percentStats[key][0]));
            let high = parseInt(parseFloat(item.percentStats[key][1]));
            percentStats[key] = Math.floor(Math.random() * (high - low + 1) + low);
          }
        }
      } //end for
    }

    if (item.set) {
      if (_setList[item.set]) {
        let setBonus = _setList[item.set];
        if (setBonus.percentStats) {
          for (let key in setBonus.percentStats) {
            setBonus.percentStats[key] = parseInt(parseFloat(setBonus.percentStats[key]));
          }
        }
        if (setBonus.stats) {
          for (let key in setBonus.stats) {
            setBonus.stats[key] = parseInt(parseFloat(setBonus.stats[key]));
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
      item.id = new ObjectId();
    }
    item.key = itemKey;
    item.rarity = rarity;
    item.amount = amount || 1;
    item.type = type;
    let itemKeyArray = itemKey.split("-"); //needs parsing;
    item.base = itemKeyArray[1];
    item.stats = newStats;
    item.effects = newEffects;
    item.percentStats = percentStats;

    /* Magic and Rare Item Spawning */
    let randomMod;
    let ilvl = item.ilvl;
    let availableMods = [];
    for (var i = 0; i < _modsList.suffix.length; i++) {
      //get all mods at this ilvl
      if (ilvl == _modsList.suffix[i].ilvl) {
        availableMods.push(_modsList.suffix[i]);
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
      item.cost = 5 * ilvl;
    }
    if (rarity == "magic") {
      item.name = item.name + " " + randomMod.name;
      item.cost = 10 * ilvl;
      item.key = item.key.replace("-common-", "-magic-");
    }
    if (rarity == "rare") {
      item.cost = 20 * ilvl;
      item.key = item.key.replace("-common-", "-rare-");
    }
    if (rarity == "unique" || rarity == "set") {
      item.cost = 100 * ilvl;
    }
    return new Item(item);
  },
};

export default ItemBuilder;
