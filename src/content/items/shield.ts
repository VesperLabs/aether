import type { Families, Uniques } from "./gear-types";

export const shieldFamilies = {
  roundShield: {
    type: "shield",
    texture: "shield-buckler",
    stats: { attackDelay: 60, defense: 10, blockChance: 10 },
    requirements: { strength: 3 },
    tiers: [
      {
        key: "woodenBuckler",
        name: "Wooden Buckler",
        flavor: "A small round buckler of plain wood.",
      },
      {
        key: "bronzeRoundShield",
        name: "Bronze Round Shield",
        flavor: "A round bronze shield with a hammered boss.",
        texture: "shield-oval",
        tint: "0xFFEEAA",
      },
      {
        key: "ironRoundShield",
        name: "Iron Round Shield",
        flavor: "A round iron shield, heavy and dependable.",
        texture: "shield-oval",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
  kiteShield: {
    type: "shield",
    texture: "shield-broken",
    stats: { attackDelay: 80, defense: 10, blockChance: 15 },
    requirements: { strength: 5 },
    tiers: [
      {
        key: "barkShield",
        name: "Bark Shield",
        flavor: "A shield of layered bark, still smelling of the forest.",
        tint: "0x996622",
      },
      {
        key: "bronzeKiteShield",
        name: "Bronze Kite Shield",
        flavor: "A kite-shaped bronze shield, long enough to guard the legs.",
        texture: "shield-kite",
        tint: "0xFFEEAA",
      },
      {
        key: "ironKiteShield",
        name: "Iron Kite Shield",
        flavor: "An iron kite shield, favoured by the town guard.",
        texture: "shield-kite",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
  towerShield: {
    type: "shield",
    texture: "shield-tower",
    stats: { attackDelay: 100, defense: 15, blockChance: 20 },
    requirements: { strength: 8 },
    tiers: [
      {
        key: "woodenTowerShield",
        name: "Wooden Tower Shield",
        flavor: "A tall wooden shield to hide behind.",
        tint: "0x996622",
      },
      {
        key: "bronzeTowerShield",
        name: "Bronze Tower Shield",
        flavor: "A bronze wall you carry with you.",
        tint: "0xFFEEAA",
      },
      {
        key: "ironTowerShield",
        name: "Iron Tower Shield",
        flavor: "A towering iron shield. You'll feel it tomorrow.",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const shieldUniques = {
  roundStage: {
    family: "roundShield",
    tier: 3,
    name: "Round Stage",
    flavor: "Once a tavern stage. Many a bard performed on it.",
    texture: "shield-round",
    mod: "blocking",
  },
  osteoCrest: {
    family: "kiteShield",
    tier: 2,
    name: "Osteo Crest",
    flavor: "Bones from the graveyard, bound into a crest.",
    texture: "shield-bone",
    mod: "leeching",
    exclusive: true,
  },
  wyrmScaleWard: {
    family: "kiteShield",
    tier: 2,
    name: "Wyrm Scale Ward",
    flavor: "A single wyrm scale, large enough to hide behind.",
    texture: "shield-wyrm",
    mod: "flameWard",
    exclusive: true,
  },
  dawnwall: {
    family: "towerShield",
    tier: 3,
    name: "Dawnwall",
    flavor: "A tower of gilded oak. The first light of morning still burns on its face.",
    tint: "0xFFFBEE",
    mod: "dawning",
  },
} as const satisfies Uniques<typeof shieldFamilies>;
