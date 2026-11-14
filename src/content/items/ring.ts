import type { Families, Uniques } from "./gear-types";

export const ringFamilies = {
  ring: {
    type: "ring",
    texture: "ring-copper-plain",
    stats: { defense: 2 },
    tiers: [
      { key: "copperRing", name: "Copper Ring", flavor: "A simple copper band." },
      {
        key: "bronzeRing",
        name: "Bronze Ring",
        flavor: "A bronze band, warm on the finger.",
        texture: "ring-silver-plain",
        tint: "0xFFEEAA",
      },
      {
        key: "ironRing",
        name: "Iron Ring",
        flavor: "A heavy iron ring that never bends.",
        texture: "ring-silver-plain",
        tint: "0xEEDDDD",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const ringUniques = {
  bloodMusic: {
    family: "ring",
    tier: 2,
    name: "Blood Music",
    flavor: "Listen closely and it hums along with your heartbeat.",
    texture: "ring-silver-ruby",
    mod: "sanguine",
  },
  theLunarHalo: {
    family: "ring",
    tier: 1,
    name: "The Lunar Halo",
    flavor: "Glows faintly under a full moon.",
    texture: "ring-silver-sapphire",
    mod: "lunar",
  },
} as const satisfies Uniques<typeof ringFamilies>;
