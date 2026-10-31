import { describe, expect, it } from "vitest";
import { parseDropArgs } from "./drop-args";

describe("parseDropArgs", () => {
  it("takes type and rarity from the item key", () => {
    expect(parseDropArgs(["sword"])).toEqual({
      type: "weapon",
      rarity: "common",
      key: "sword",
      amount: 1,
    });
  });

  it("reads rarity and amount in either order", () => {
    expect(parseDropArgs(["sword", "3", "Magic"])).toMatchObject({ rarity: "magic", amount: 3 });
  });

  it("still reads the old four-part form", () => {
    expect(parseDropArgs(["weapon-common-sword-2"])).toEqual({
      type: "weapon",
      rarity: "common",
      key: "sword",
      amount: 2,
    });
  });

  it("explains unknown items and args", () => {
    expect(parseDropArgs([])).toHaveProperty("error");
    expect(parseDropArgs(["nope"])).toHaveProperty("error");
    expect(parseDropArgs(["sword", "shiny"])).toHaveProperty("error");
  });

  it("refuses rarities an item can't have", () => {
    expect(parseDropArgs(["foxBlade", "magic"])).toHaveProperty("error");
    expect(parseDropArgs(["fireball", "rare"])).toHaveProperty("error");
  });
});
