import type { Families, Uniques } from "./gear-types";

export const amuletFamilies = {
  amulet: {
    type: "amulet",
    texture: "amulet-gold-plain",
    stats: { defense: 2 },
    tiers: [
      {
        key: "silverAmulet",
        name: "Copper Amulet",
        flavor: "A copper amulet on a leather cord.",
        tint: "0xDDCCBB",
      },
      {
        key: "bronzeAmulet",
        name: "Bronze Amulet",
        flavor: "A bronze amulet, polished smooth by worry.",
        texture: "amulet-silver-plain",
        tint: "0xFFEEAA",
      },
      {
        key: "ironAmulet",
        name: "Iron Amulet",
        flavor: "An iron amulet, cold against the skin.",
        texture: "amulet-silver-plain",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const amuletUniques = {
  forestBeads: {
    family: "amulet",
    tier: 1,
    name: "The Forest Beads",
    flavor: "Seeds from the oldest trees, strung by Tudwick.",
    texture: "amulet-beads-green",
    mod: "vital",
  },
} as const satisfies Uniques<typeof amuletFamilies>;
