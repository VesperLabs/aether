import type { ItemRarityTable } from "./item-types";

export const accessoryItems = {
  common: {
    glasses: {
      ilvl: 1,
      name: "Glasses",
      base: "glasses",
      texture: "accessory-glasses",
      slot: "accessory",
      stats: { accuracy: 1 },
    },
    goggles: {
      ilvl: 2,
      name: "Goggles",
      base: "glasses",
      tint: "0xCCCCFF",
      texture: "accessory-glasses",
      slot: "accessory",
    },
  },
  unique: {
    compoundLenses: {
      ilvl: 1,
      name: "Compound Lenses",
      base: "glasses",
      texture: "accessory-glasses",
      tint: "0xFF6666",
      slot: "accessory",
      stats: {
        critChance: [4, 5],
        dodgeChance: [4, 5],
        walkSpeed: 10,
        accuracy: 5,
        intelligence: 5,
      },
    },
    mermanFins: {
      exclusive: true,
      ilvl: 2,
      name: "Merman Fins",
      base: "fins",
      texture: "accessory-fins",
      slot: "accessory",
      stats: {
        defense: [5, 10],
        waterResistance: 10,
        dodgeChance: [4, 5],
        walkSpeed: 5,
        regenMp: 2,
        spellPower: 5,
        maxMp: 25,
      },
    },
    jakeMask: {
      exclusive: true,
      ilvl: 10,
      name: "Action Jake Mask",
      base: "cap",
      texture: "accessory-jake",
      slot: "accessory",
      stats: { intelligence: 10, strength: 10, dexterity: 10, vitality: 10 },
    },
  },
} as const satisfies ItemRarityTable;
