import type { Families, Uniques } from "./gear-types";

export const armorFamilies = {
  robe: {
    type: "armor",
    texture: "armor-robe",
    stats: { defense: 3, maxMp: 2 },
    tiers: [
      {
        key: "clothRobe",
        name: "Cloth Robe",
        flavor: "A plain cloth robe. Every apprentice owns one.",
        tint: "0xFFDDCC",
      },
      {
        key: "silkRobe",
        name: "Silk Robe",
        flavor: "A silk robe that drapes well and moves better.",
        tint: "0xFFFFFF",
      },
      {
        key: "wizardRobe",
        name: "Wizard Robe",
        flavor: "Embroidered with runes only half its owners can read.",
        texture: "armor-robe-wizard",
      },
      null,
      null,
      null,
    ],
  },
  coat: {
    type: "armor",
    texture: "armor-coat",
    stats: { defense: 4 },
    requirements: { dexterity: 2 },
    tiers: [
      {
        key: "clothCoat",
        name: "Cloth Coat",
        flavor: "A cloth coat, padded at the shoulders.",
        tint: "0xFFDDCC",
      },
      {
        key: "leatherCoat",
        name: "Leather Coat",
        flavor: "Tough leather, worn soft by the road.",
        texture: "armor-coat-leather",
      },
      {
        key: "ghoulhideCoat",
        name: "Ghoulhide Coat",
        flavor: "A coat of ghoul hide. Tough, cold and slightly damp.",
        tint: "0x889988",
      },
      null,
      null,
      null,
    ],
  },
  "light-plate-armor": {
    type: "armor",
    texture: "armor-plate-light",
    stats: { defense: 6 },
    requirements: { strength: 4 },
    tiers: [
      {
        key: "nutshellPlate",
        name: "Nutshell Light Plate",
        flavor: "Plates of hardened nutshell, laced together.",
        tint: "0xCC9966",
      },
      {
        key: "bronzePlate",
        name: "Bronze Light Plate",
        flavor: "Light bronze plate, fresh from Steve's forge.",
        tint: "0xFFEEAA",
      },
      {
        key: "ironPlate",
        name: "Iron Light Plate",
        flavor: "Light iron plate for those who'd rather not be stabbed.",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
  "heavy-plate-armor": {
    type: "armor",
    texture: "armor-plate",
    stats: { defense: 11 },
    requirements: { strength: 8 },
    tiers: [
      {
        key: "nutshellHeavyPlate",
        name: "Nutshell Heavy Plate",
        flavor: "Layered nutshell plate. Surprisingly hard to crack.",
        tint: "0xCC9966",
      },
      {
        key: "bronzeHeavyPlate",
        name: "Bronze Heavy Plate",
        flavor: "Heavy bronze plate. Loud, sturdy and slow.",
        tint: "0xFFEEAA",
      },
      {
        key: "ironHeavyPlate",
        name: "Iron Heavy Plate",
        flavor: "Full iron plate. Arrows just give up.",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const armorUniques = {
  theMossmanProphecy: {
    family: "robe",
    tier: 1,
    name: "The Mossman Prophecy",
    flavor: "The moss on it grows into words no one has finished reading.",
    tint: "0x66AA66",
    mod: "mending",
  },
  couriersCamouflage: {
    family: "coat",
    tier: 1,
    name: "Courier's Camouflage",
    flavor: "The Courier was never late, and never seen.",
    tint: "0x66CCFF",
    mod: "elusive",
  },
  iceCrabShell: {
    family: "heavy-plate-armor",
    tier: 2,
    name: "The Ice Crab Shell",
    flavor: "Pried off an ice crab. It keeps you cool, and alive.",
    tint: "0x8899CC",
    mod: "enduring",
  },
  fateShroud: {
    family: "robe",
    tier: 3,
    name: "Fate Shroud",
    flavor: "Those who wear it say they already know how it ends.",
    texture: "armor-robe-wizard-white",
    tint: "0xFFDD55",
    mod: "fortunate",
  },
} as const satisfies Uniques<typeof armorFamilies>;
