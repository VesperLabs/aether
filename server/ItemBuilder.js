/* This file and Diablo II are the main reason this game exists */
import crypto from "crypto";
import Item from "./Item.js";
const _itemList = {
  weapon: {
    common: {
      katar: {
        ilvl: 1,
        base: "katar",
        name: "Katar",
        texture: "weapon-katar",
        slot: "hands",
        stats: {
          attackDelay: 30,
          minDamage: 0,
          maxDamage: 2,
          range: 1,
        },
      },
      spade: {
        ilvl: 1,
        base: "spade",
        name: "Spade",
        texture: "weapon-spade",
        slot: "hands",
        stats: {
          attackDelay: 50,
          minDamage: 1,
          maxDamage: 2,
          range: 1,
        },
      },
      sword: {
        ilvl: 1,
        base: "dagger",
        name: "Dagger",
        texture: "weapon-dagger",
        slot: "hands",
        stats: {
          attackDelay: 30,
          minDamage: 0,
          maxDamage: 2,
          range: 1,
        },
      },
      hammer: {
        ilvl: 1,
        base: "hammer",
        name: "Hammer",
        texture: "weapon-hammer",
        slot: "hands",
        stats: {
          attackDelay: 300,
          minDamage: 2,
          maxDamage: 3,
          range: 1,
        },
      },
      axe: {
        ilvl: 1,
        base: "axe",
        name: "Axe",
        texture: "weapon-axe",
        slot: "hands",
        stats: {
          attackDelay: 250,
          minDamage: 2,
          maxDamage: 3,
          range: 1,
        },
      },
      gladius: {
        ilvl: 2,
        base: "sword",
        name: "Gladius",
        texture: "weapon-gladius",
        slot: "hands",
        requirements: {
          level: 10,
        },
        stats: {
          attackDelay: 250,
          minDamage: 5,
          maxDamage: 5,
          range: 1.25,
        },
      },
      scythe: {
        ilvl: 1,
        base: "scythe",
        name: "Scythe",
        texture: "weapon-scythe",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          attackDelay: 150,
          minDamage: 1,
          maxDamage: 3,
          range: 1,
        },
      },
      spear: {
        ilvl: 1,
        base: "spear",
        name: "Spear",
        texture: "weapon-spear",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          attackDelay: 500,
          minDamage: 4,
          maxDamage: 4,
          range: 2,
        },
      },
    },
    unique: {
      darkWhistler: {
        ilvl: 1,
        base: "dagger",
        name: "Dark Whistler",
        texture: "weapon-dagger",
        tint: "0xFF88FF",
        slot: "hands",
        stats: {
          attackDelay: 100,
          minDamage: 4,
          maxDamage: 4,
          critChance: [1, 5],
          range: 1,
        },
      },
      soulEdge: {
        ilvl: 2,
        name: "Soul Edge",
        base: "sword",
        texture: "weapon-claymore-soul",
        slot: "hands",
        stats: {
          attackDelay: 350,
          minDamage: 8,
          maxDamage: 8,
          critChance: 5,
          range: 2,
        },
      },
    },
    set: {
      hawkwingsPincher: {
        ilvl: 1,
        set: "hawkwings",
        name: "Hawkwing's Pincher",
        base: "scythe",
        texture: "weapon-scythe",
        tint: "0x55FF55",
        slot: "hands",
        requirements: {
          level: 5,
        },
        stats: {
          attackDelay: 150,
          minDamage: 3,
          maxDamage: 5,
          range: 1,
        },
      },
      hawkwingsTickler: {
        ilvl: 1,
        set: "hawkwings",
        name: "Hawkwing's Tickler",
        base: "scythe",
        texture: "weapon-scythe",
        tint: "0x5588FF",
        slot: "hands",
        requirements: {
          level: 5,
        },
        stats: {
          attackDelay: 150,
          minDamage: 3,
          maxDamage: 5,
          range: 1,
        },
      },
    },
  },
  helmet: {
    common: {
      colloquialCap: {
        ilvl: 1,
        name: "Colloquial Cap",
        base: "cap",
        texture: "helmet-cap",
        tint: "0x865027",
        slot: "helmet",
        stats: {
          defense: 3,
        },
      },
      clothCap: {
        ilvl: 1,
        name: "Cloth Cap",
        base: "cap",
        texture: "helmet-cap",
        tint: "0xFFDDCC",
        slot: "helmet",
        stats: {
          defense: 3,
        },
      },
    },
    unique: {
      tudwicksCap: {
        ilvl: 1,
        name: "Tudwick's Cap",
        base: "cap",
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
      nutshellPlate: {
        ilvl: 1,
        name: "Nutshell Plate",
        base: "armor",
        texture: "armor-light-plate",
        tint: "0xCC9966",
        slot: "armor",
        stats: {
          defense: 5,
        },
      },
      clothRobe: {
        ilvl: 1,
        name: "Cloth Robe",
        base: "armor",
        texture: "armor-robe",
        tint: "0xFFDDCC",
        slot: "armor",
        stats: {
          defense: 3,
        },
      },
      bronzePlate: {
        ilvl: 2,
        name: "Bronze Plate",
        base: "armor",
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
      bronzeHeavyPlate: {
        ilvl: 2,
        name: "Bronze Heavy Plate",
        base: "armor",
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
      wizardRobe: {
        ilvl: 3,
        name: "Wizard Robe",
        base: "armor",
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
      theMossmanProphecy: {
        ilvl: 1,
        name: "The Mossman Prophecy",
        base: "armor",
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
      chetsPurpleShirt: {
        ilvl: 1,
        set: "chets",
        name: "Chet's Purple Shirt",
        base: "armor",
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
      nutshellBoots: {
        ilvl: 1,
        name: "Nutshell Boots",
        base: "boots",
        texture: "boots-cloth",
        tint: "0xCC9966",
        slot: "boots",
        stats: {
          speed: 5,
          defense: 1,
        },
      },
      leatherBoots: {
        ilvl: 2,
        name: "Leather Boots",
        base: "boots",
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
      chetsNeonKicks: {
        ilvl: 1,
        set: "chets",
        name: "Chet's Neon Kicks",
        base: "boots",
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
      clothPants: {
        ilvl: 1,
        name: "Cloth Pants",
        base: "pants",
        texture: "pants-cloth",
        tint: "0xFFDDCC",
        slot: "pants",
        stats: {
          defense: 3,
        },
      },
      leatherPants: {
        ilvl: 2,
        name: "Leather Pants",
        base: "pants",
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
      chetsChampions: {
        ilvl: 1,
        set: "chets",
        name: "Chet's Champions",
        base: "pants",
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
      barkShield: {
        ilvl: 1,
        name: "Bark Shield",
        base: "shield",
        texture: "shield-broken",
        tint: "0x865027",
        slot: "hands",
        stats: {
          attackDelay: 50,
          defense: 5,
          blockChance: 5,
        },
      },
      buckler: {
        ilvl: 2,
        name: "Buckler",
        base: "shield",
        texture: "shield-buckler",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          attackDelay: 50,
          defense: 10,
          blockChance: 10,
        },
      },
    },
    unique: {
      roundStage: {
        ilvl: 2,
        name: "Round Stage",
        base: "shield",
        texture: "shield-round",
        tint: "0xFFFFFF",
        slot: "hands",
        stats: {
          critChance: [4, 5],
          attackDelay: 50,
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
      glasses: {
        ilvl: 1,
        name: "Glasses",
        base: "accessory",
        texture: "accessory-glasses",
        tint: "0xFFFFFF",
        slot: "accessory",
        stats: {
          accuracy: 1,
        },
      },
    },
    unique: {
      compoundLenses: {
        ilvl: 1,
        name: "Compound Lenses",
        base: "accessory",
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
      silverRing: {
        ilvl: 1,
        name: "Silver Ring",
        base: "ring",
        texture: "ring-silver-plain",
        tint: "0xFFFFFF",
        slot: "ring",
        stats: {
          defense: 1,
        },
      },
      goldRing: {
        ilvl: 2,
        name: "Gold Ring",
        base: "ring",
        texture: "ring-gold-plain",
        tint: "0xFFFFFF",
        slot: "ring",
        stats: {
          defense: 5,
        },
      },
    },
    set: {
      timmysSignet: {
        ilvl: 2,
        set: "timmys",
        name: "Timmy's Signet",
        base: "ring",
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
      bloodMusic: {
        ilvl: 2,
        name: "Blood Music",
        base: "ring",
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
      silverAmulet: {
        ilvl: 1,
        name: "Silver Amulet",
        base: "amulet",
        texture: "amulet-silver-plain",
        tint: "0xFFFFFF",
        slot: "amulet",
        stats: {
          defense: 1,
        },
      },
      goldAmulet: {
        ilvl: 2,
        name: "Gold Amulet",
        base: "amulet",
        texture: "amulet-gold-plain",
        tint: "0xFFFFFF",
        slot: "amulet",
        stats: {
          defense: 5,
        },
      },
    },
    set: {
      timmysChain: {
        ilvl: 2,
        set: "timmys",
        name: "Timmy's Chain",
        base: "amulet",
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
      smallHpPotion: {
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
      smallMpPotion: {
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
      mediumHpPotion: {
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
      mediumPotionMp: {
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
      blueSporangium: {
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
      redApple: {
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
      batMeat: {
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
      spiderMeat: {
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
      cheese: {
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
      grapes: {
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
      skull: {
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
    let newStats = {};
    let newEffects = {};
    let percentStats = {}; //holds all of the % values to be calculated together after stats..

    try {
      item =
        rarity == "magic" || rarity == "rare"
          ? _itemList[type]["common"][itemKey]
          : _itemList[type][rarity][itemKey];
      item = JSON.parse(JSON.stringify(item));
    } catch (e) {
      console.log(`🔧 Item not found for ${type} ${rarity} ${itemKey}`);
      return null;
    }

    if (item.stats) {
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
