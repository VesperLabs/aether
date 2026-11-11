import type { ItemRarityTable } from "./item-types";

export const bagItems = {
  rare: {
    smallPouch: {
      level: 1,
      name: "Small Pouch",
      flavor: "A small pouch with room for a few more things.",
      base: "bag",
      slot: "bag",
      texture: "bag-small-pouch",
      space: 4,
    },
    largePouch: {
      level: 9,
      name: "Large Pouch",
      flavor: "A large pouch for the serious collector.",
      base: "bag",
      slot: "bag",
      texture: "bag-large-pouch",
      space: 8,
    },
    mediumPouch: {
      level: 17,
      name: "Large Pouch",
      flavor: "A sturdy pouch with plenty of room.",
      base: "bag",
      slot: "bag",
      texture: "bag-large-pouch",
      space: 12,
    },
  },
  unique: {
    raesBasket: {
      exclusive: true,
      level: 9,
      name: "Rae's Basket",
      flavor: "Rae's picnic basket. Somehow it never runs out of room.",
      base: "bag",
      slot: "bag",
      texture: "bag-basket",
      space: 10,
    },
  },
} as const satisfies ItemRarityTable;
