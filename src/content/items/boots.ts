import type { Families, Uniques } from "./gear-types";

export const bootsFamilies = {
  boots: {
    type: "boots",
    texture: "boots-cloth",
    stats: { walkSpeed: 5, defense: 2 },
    tiers: [
      {
        key: "clothBoots",
        name: "Cloth Boots",
        flavor: "Soft cloth boots, quiet on the floorboards.",
        tint: "0xFFDDCC",
      },
      {
        key: "leatherBoots",
        name: "Leather Boots",
        flavor: "Good leather boots, broken in on many roads.",
        tint: "0xAA7744",
      },
      {
        key: "ghoulhideBoots",
        name: "Ghoulhide Boots",
        flavor: "Ghoul-hide boots. Nothing follows your tracks.",
        tint: "0x889988",
      },
      null,
      null,
      null,
    ],
  },
  greaves: {
    type: "boots",
    texture: "boots-plate",
    stats: { walkSpeed: 5, defense: 4 },
    requirements: { strength: 6 },
    tiers: [
      {
        key: "nutshellGreaves",
        name: "Nutshell Greaves",
        flavor: "Nutshell shin guards for kicking through the brush.",
        tint: "0xCC9966",
      },
      {
        key: "bronzeGreaves",
        name: "Bronze Greaves",
        flavor: "Bronze greaves that clank with every step.",
        tint: "0xFFEEAA",
      },
      {
        key: "ironGreaves",
        name: "Iron Greaves",
        flavor: "Iron greaves, heavy enough to anchor you in place.",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const bootsUniques = {
  chickenFeet: {
    family: "boots",
    tier: 2,
    name: "Chicken Feet",
    flavor: "They really are chicken feet. You will run faster.",
    texture: "boots-wings",
    tint: "0xFFFF00",
    mod: "swift",
  },
} as const satisfies Uniques<typeof bootsFamilies>;
