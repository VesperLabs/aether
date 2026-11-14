import { describe, expect, it } from "vitest";
import { actors } from "../actors/actors";
import { cardItems } from "./card";
import { canSlotMod } from "./mods";

/** Actors that are neither a keeper nor a mob: no card. */
const NO_CARD = ["dummy", "traveler", "loiterer"];

const cards = Object.values(cardItems).flatMap((table) => Object.entries(table));
const kebab = (id: string) => id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("cards", () => {
  it("exist for every keeper and mob, named after it", () => {
    const wanted = Object.keys(actors)
      .filter((id) => !NO_CARD.includes(id))
      .map((id) => `${id}Card`);
    expect(cards.map(([key]) => key).sort()).toEqual(wanted.sort());
  });

  it("use the actor's id in kebab case for their art", () => {
    for (const [key, card] of cards) {
      expect(card.texture).toBe(`stackable-${kebab(key.replace(/Card$/, ""))}-card`);
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
