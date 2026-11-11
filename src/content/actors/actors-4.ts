import type { ActorDefinition } from "./actor-types";

/** Adventurers: actors with no shop or quests of their own, out and about like players. */
export const actors4 = {
  traveler: {
    flavor: "Another adventurer passing through, seeing the sights and minding their own business.",
    charClass: "warrior",
    profile: {
      userName: "Traveler",
      race: "human",
      gender: "male",
      face: { texture: "face-1" },
      hair: { texture: "hair-3", tint: "0x886644" },
    },
    baseStats: { level: 1 },
    equipment: {
      handLeft: ["weapon", "common", "hatchet"],
      armor: ["armor", "common", "clothRobe"],
      pants: ["pants", "common", "clothPants"],
    },
  },
  loiterer: {
    flavor: "An apprentice mage who would rather people-watch than study.",
    charClass: "mage",
    profile: {
      userName: "Loiterer",
      race: "human",
      gender: "female",
      face: { texture: "face-1" },
      hair: { texture: "hair-4", tint: "0x88FFFF" },
    },
    baseStats: { level: 1 },
    equipment: {
      handLeft: ["weapon", "common", "wand"],
      armor: ["armor", "common", "clothRobe"],
      pants: ["pants", "common", "clothPants"],
    },
    behaviors: { guard: {} },
  },
} as const satisfies Readonly<Record<string, ActorDefinition>>;
