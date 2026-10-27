import type { ItemRarityTable } from "./item-types";

export const rangedItems = {
  common: {
    shortBow: {
      ilvl: 1,
      base: "shortBow",
      name: "Short Bow",
      texture: "ranged-shortBow",
      slot: "hands",
      stats: { range: 4.5, attackDelay: 700, minDamage: 1, maxDamage: 1, spCost: 3 },
      requirements: { dexterity: 3 },
    },
    longBow: {
      ilvl: 1,
      base: "longBow",
      name: "Long Bow",
      texture: "ranged-longBow",
      slot: "hands",
      stats: { range: 7, attackDelay: 900, minDamage: 1, maxDamage: 2, spCost: 3 },
      requirements: { dexterity: 3 },
    },
    swiftBow: {
      ilvl: 2,
      base: "shortBow",
      name: "Swift Bow",
      texture: "ranged-shortBow",
      slot: "hands",
    },
    greatBow: {
      ilvl: 2,
      base: "longBow",
      name: "Great Bow",
      texture: "ranged-longBow",
      slot: "hands",
    },
  },
  unique: {
    cruelBarb: {
      ilvl: 1,
      base: "longBow",
      texture: "ranged-longBow",
      name: "Cruel Barb",
      slot: "hands",
      tint: "0x99EE66",
      stats: { critChance: 15, critMultiplier: 1 },
      triggers: [
        {
          event: "onAttackHit",
          type: "debuff",
          name: "poison",
          level: 2,
          chance: 3,
        },
      ],
    },
    stickyWicket: {
      ilvl: 2,
      base: "shortBow",
      texture: "ranged-shortBow-metal",
      name: "The Sticky Wicket",
      slot: "hands",
      tint: "0x88CCCC",
      stats: {
        range: 6,
        attackDelay: 500,
        minWaterDamage: 1,
        maxWaterDamage: 2,
        dodgeChance: [5, 10],
      },
      triggers: [
        {
          event: "onAttackHit",
          type: "debuff",
          name: "slow",
          level: 2,
          chance: 3,
        },
      ],
    },
  },
} as const satisfies ItemRarityTable;
