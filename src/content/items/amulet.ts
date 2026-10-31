import type { ItemRarityTable } from "./item-types";

export const amuletItems = {
  common: {
    silverAmulet: {
      ilvl: 1,
      name: "Copper Amulet",
      flavor: "A copper amulet on a leather cord.",
      base: "amulet",
      tint: "0xDDCCBB",
      texture: "amulet-gold-plain",
      slot: "amulet",
      stats: { defense: 2 },
    },
    bronzeAmulet: {
      ilvl: 2,
      name: "Bronze Amulet",
      flavor: "A bronze amulet, polished smooth by worry.",
      tint: "0xFFEEAA",
      base: "amulet",
      texture: "amulet-silver-plain",
      slot: "amulet",
      stats: {},
    },
    ironAmulet: {
      ilvl: 3,
      name: "Iron Amulet",
      flavor: "An iron amulet, cold against the skin.",
      tint: "0xEEDDDD",
      base: "amulet",
      texture: "amulet-silver-plain",
      slot: "amulet",
      stats: {},
    },
  },
  set: {
    timmysChain: {
      ilvl: 2,
      setName: "timmys",
      name: "Timmy's Chain",
      flavor: "Timmy's chain, matched to his signet.",
      base: "amulet",
      texture: "amulet-gold-plain",
      slot: "amulet",
      stats: { maxHp: 20, maxMp: 20 },
    },
  },
  unique: {
    forestBeads: {
      ilvl: 1,
      name: "The Forest Beads",
      flavor: "Seeds from the oldest trees, strung by Tudwick.",
      base: "amulet",
      texture: "amulet-beads-green",
      slot: "amulet",
      stats: { defense: 3, vitality: 3, strength: 3, intelligence: 3, dexterity: 3 },
    },
  },
} as const satisfies ItemRarityTable;
