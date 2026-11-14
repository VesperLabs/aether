import type { Families, Uniques } from "./gear-types";

export const rangedFamilies = {
  shortBow: {
    type: "ranged",
    texture: "ranged-shortBow",
    stats: { range: 4.5, attackDelay: 700, minDamage: 1, maxDamage: 1, spCost: 3 },
    requirements: { dexterity: 3 },
    tiers: [
      {
        key: "shortBow",
        name: "Short Bow",
        flavor: "A short bow, quick to draw and easy to carry.",
      },
      { key: "swiftBow", name: "Swift Bow", flavor: "A light bow strung for fast shots." },
      null,
      null,
      null,
      null,
    ],
  },
  longBow: {
    type: "ranged",
    texture: "ranged-longBow",
    stats: { range: 7, attackDelay: 900, minDamage: 1, maxDamage: 2, spCost: 3 },
    requirements: { dexterity: 3 },
    tiers: [
      { key: "longBow", name: "Long Bow", flavor: "A tall bow with a long reach." },
      {
        key: "greatBow",
        name: "Great Bow",
        flavor: "A huge bow. Few have the strength to draw it fully.",
      },
      null,
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const rangedUniques = {
  cruelBarb: {
    family: "longBow",
    tier: 1,
    name: "Cruel Barb",
    flavor: "Its arrows hook in and don't come out clean.",
    tint: "0x99EE66",
    mod: "venomous",
  },
  stickyWicket: {
    family: "shortBow",
    tier: 2,
    name: "The Sticky Wicket",
    flavor: "A bow strung with something sticky. Nobody knows what.",
    texture: "ranged-shortBow-metal",
    tint: "0x88CCCC",
    mod: "slowing",
  },
} as const satisfies Uniques<typeof rangedFamilies>;
