import type { Families, Uniques } from "./gear-types";

export const glovesFamilies = {
  gloves: {
    type: "gloves",
    texture: "gloves-cloth",
    stats: { defense: 2 },
    tiers: [
      {
        key: "clothGloves",
        name: "Cloth Gloves",
        flavor: "Plain cloth gloves for blister-free hands.",
        tint: "0xFFDDCC",
      },
      {
        key: "silkGloves",
        name: "Silk Gloves",
        flavor: "Silk gloves for a lighter touch.",
        tint: "0xFFFFFF",
      },
      {
        key: "wizardGloves",
        name: "Wizard Gloves",
        flavor: "Gloves stitched to keep spell-sparks off the fingers.",
        tint: "0x666699",
      },
      null,
      null,
      null,
    ],
  },
  bracers: {
    type: "gloves",
    texture: "gloves-bracers",
    stats: { defense: 3 },
    requirements: { dexterity: 2 },
    tiers: [
      {
        key: "clothBracers",
        name: "Cloth Bracers",
        flavor: "Cloth wraps for the wrists.",
        tint: "0xFFDDCC",
      },
      {
        key: "leatherBracers",
        name: "Leather Bracers",
        flavor: "Leather bracers to turn a glancing blow.",
        tint: "0xAA7744",
      },
      {
        key: "ghoulhideBracers",
        name: "Ghoulhide Bracers",
        flavor: "Ghoul-hide bracers. They grip back.",
        tint: "0x889988",
      },
      null,
      null,
      null,
    ],
  },
  gauntlets: {
    type: "gloves",
    texture: "gloves-plate",
    stats: { defense: 4 },
    requirements: { strength: 6 },
    tiers: [
      {
        key: "nutshellGauntlets",
        name: "Nutshell Gauntlets",
        flavor: "Nutshell plates riveted over the knuckles.",
        tint: "0xCC9966",
      },
      {
        key: "bronzeGauntlets",
        name: "Bronze Gauntlets",
        flavor: "Bronze gauntlets. Steve's sturdiest work.",
        tint: "0xFFEEAA",
      },
      {
        key: "ironGauntlets",
        name: "Iron Gauntlets",
        flavor: "Iron gauntlets that turn a fist into a hammer.",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const glovesUniques = {
  flamingFinger: {
    family: "gloves",
    tier: 1,
    name: "The Flaming Finger",
    flavor: "One finger is always lit. Handy for campfires.",
    tint: "0xFF4400",
    mod: "casting",
  },
  aeryMitts: {
    family: "gloves",
    tier: 2,
    name: "Aery Mitts",
    flavor: "Light as air. Your hands feel like they could float off.",
    texture: "gloves-fur",
    tint: "0x66CCFF",
    mod: "casting",
  },
} as const satisfies Uniques<typeof glovesFamilies>;
