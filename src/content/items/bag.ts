import type { Families, Uniques } from "./gear-types";

export const bagFamilies = {
  bag: {
    type: "bag",
    texture: "bag-small-pouch",
    space: 4,
    tiers: [
      {
        key: "smallPouch",
        name: "Small Pouch",
        flavor: "A small pouch with room for a few more things.",
      },
      {
        key: "mediumPouch",
        name: "Medium Pouch",
        flavor: "A sturdy pouch with plenty of room.",
        texture: "bag-large-pouch",
      },
      {
        key: "largePouch",
        name: "Large Pouch",
        flavor: "A large pouch for the serious collector.",
        texture: "bag-large-pouch",
      },
      null,
      null,
      null,
    ],
  },
} as const satisfies Families;

export const bagUniques = {
  raesBasket: {
    family: "bag",
    tier: 2,
    name: "Rae's Basket",
    flavor: "Rae's picnic basket. Somehow it never runs out of room.",
    texture: "bag-basket",
    exclusive: true,
  },
} as const satisfies Uniques<typeof bagFamilies>;
