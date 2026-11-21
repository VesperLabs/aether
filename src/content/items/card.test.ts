import { describe, expect, it } from "vitest";
import { actors } from "../actors/actors";
import { cardItems } from "./card";
import { canSlotMod } from "./mods";

/** Adventurers out and about like players, the training dummy and critters: not mobs, no card. */
const NOT_MOBS = ["traveler", "loiterer", "dummy", "butterfly", "sparrow"];

/** Mobs: actors that don't talk (keepers and townsfolk do) and aren't one of the above. */
const mobs = Object.entries(actors)
  .filter(([id, actor]) => !NOT_MOBS.includes(id) && !(actor as { dialogues?: object }).dialogues)
  .map(([id]) => id);

const cards = Object.values(cardItems).flatMap((table) => Object.entries(table));

describe("cards", () => {
  it("exist for every mob and nothing else, named after it", () => {
    const wanted = mobs.map((id) => `${id}Card`);
    expect(cards.map(([key]) => key).sort()).toEqual(wanted.sort());
  });

  it("use the actor's id for their art and name", () => {
    for (const [key, card] of cards) {
      const id = key.replace(/Card$/, "");
      expect(card.texture).toBe(`stackable-${id}-card`);
      expect(card.name).toBe(`${(actors as Record<string, any>)[id].profile.userName} Card`);
    }
  });

  it("are dropped by their own mob, once, by rarity", () => {
    for (const [key] of cards) {
      const { drops } = (actors as Record<string, any>)[key.replace(/Card$/, "")];
      expect(drops.filter((drop: { item: string }) => drop.item === key)).toHaveLength(1);
    }
  });

  it("carry a mod that fits some gear", () => {
    const types = ["weapon", "ranged", "helmet", "armor", "gloves", "boots", "pants", "shield"];
    types.push("ring", "amulet", "accessory");
    for (const [, card] of cards) {
      expect(types.some((type) => canSlotMod(card.mod, type))).toBe(true);
    }
  });
});
