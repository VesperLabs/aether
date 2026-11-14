import type { Families, Uniques } from "./gear-types";

export const accessoryFamilies = {
  glasses: {
    type: "accessory",
    texture: "accessory-glasses",
    stats: { accuracy: 1 },
    tiers: [
      { key: "glasses", name: "Glasses", flavor: "Plain glasses. Everything is suddenly sharper." },
      {
        key: "goggles",
        name: "Goggles",
        flavor: "Goggles for keeping dust and spray out of your eyes.",
        tint: "0xCCCCFF",
      },
      null,
      null,
      null,
      null,
    ],
  },
  fins: {
    type: "accessory",
    texture: "accessory-fins",
    tiers: [null, null, null, null, null, null],
  },
  mask: {
    type: "accessory",
    texture: "accessory-jake",
    tiers: [null, null, null, null, null, null],
  },
} as const satisfies Families;

export const accessoryUniques = {
  compoundLenses: {
    family: "glasses",
    tier: 1,
    name: "Compound Lenses",
    flavor: "Insect lenses. You see in every direction at once.",
    tint: "0xFF6666",
    mod: "precise",
  },
  mermanFins: {
    family: "fins",
    tier: 2,
    name: "Merman Fins",
    flavor: "Fins of the river folk. Sergio says they once swam his valley.",
    mod: "tideWard",
    exclusive: true,
  },
  jakeMask: {
    family: "mask",
    tier: 6,
    name: "Action Jake Mask",
    flavor: "Action Jake never left home without it.",
    mod: "strong",
    exclusive: true,
  },
} as const satisfies Uniques<typeof accessoryFamilies>;
