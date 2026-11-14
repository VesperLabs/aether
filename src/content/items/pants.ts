import type { Families, Uniques } from "./gear-types";

export const pantsFamilies = {
  pants: {
    type: "pants",
    texture: "pants-cloth",
    stats: { defense: 2 },
    tiers: [
      {
        key: "clothPants",
        name: "Cloth Pants",
        flavor: "Plain cloth trousers. Better than nothing.",
        tint: "0xFFDDCC",
      },
      {
        key: "leatherPants",
        name: "Leather Pants",
        flavor: "Leather trousers, tough at the knee.",
        tint: "0xAA7744",
      },
      {
        key: "ghoulhidePants",
        name: "Ghoulhide Pants",
        flavor: "Ghoul-hide trousers. Don't ask where the seams came from.",
        tint: "0x889988",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const pantsUniques = {
  hauntedTrousers: {
    family: "pants",
    tier: 1,
    name: "Haunted Trousers",
    flavor: "Something still lives in the left leg. It's friendly.",
    tint: "0x22AACC",
    mod: "evasive",
  },
  greenTeaThreads: {
    family: "pants",
    tier: 2,
    name: "Green Tea's Threads",
    flavor: "Green Tea wove them to stay calm under any blow.",
    tint: "0x44AA66",
    mod: "regenerating",
  },
  ferrousLeggings: {
    family: "pants",
    tier: 3,
    name: "Ferrous Leggings",
    flavor: "Iron-thread leggings that hum near the mines.",
    tint: "0xFF6644",
    mod: "wrathful",
  },
} as const satisfies Uniques<typeof pantsFamilies>;
