import type { ItemRarityTable } from "./item-types";

export const ringItems = {
  common: {
    copperRing: {
      ilvl: 1,
      name: "Copper Ring",
      base: "ring",
      texture: "ring-copper-plain",
      slot: "ring",
      stats: { defense: 2 },
    },
    bronzeRing: {
      ilvl: 2,
      name: "Bronze Ring",
      tint: "0xFFEEAA",
      base: "ring",
      texture: "ring-silver-plain",
      slot: "ring",
      stats: {},
    },
    ironRing: {
      ilvl: 3,
      name: "Iron Ring",
      base: "ring",
      tint: "0xEEDDDD",
      texture: "ring-silver-plain",
      slot: "ring",
      stats: {},
    },
  },
  set: {
    timmysSignet: {
      ilvl: 2,
      setName: "timmys",
      name: "Timmy's Signet",
      base: "ring",
      texture: "ring-silver-sapphire",
      slot: "ring",
      stats: { strength: 3, vitality: 3 },
    },
  },
  unique: {
    bloodMusic: {
      ilvl: 2,
      name: "Blood Music",
      base: "ring",
      texture: "ring-silver-ruby",
      slot: "ring",
      stats: { regenHp: [3, 4], maxHp: [15, 20], strength: 5 },
      percentStats: { maxHp: 15 },
    },
    theLunarHalo: {
      ilvl: 1,
      name: "The Lunar Halo",
      base: "ring",
      texture: "ring-silver-sapphire",
      slot: "ring",
      stats: { intelligence: 5, castDelay: -50, spellPower: 5 },
      percentStats: { maxMp: 15 },
    },
  },
} as const satisfies ItemRarityTable;
