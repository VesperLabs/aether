import { describe, expect, it } from "vitest";
import { areAllies, sideOf } from "./rules";

const player = (id: string) => ({ id, isPlayer: true });
const wild = (id: string) => ({ id, isPlayer: false });
const pet = (id: string, ownerId: string) => ({ id, isPlayer: false, ownerId });

describe("allegiance", () => {
  it("puts players on their own side, pets on their owner's, and other NPCs on the wild side", () => {
    expect(sideOf(player("ann"))).toBe("ann");
    expect(sideOf(pet("crab", "ann"))).toBe("ann");
    expect(sideOf(wild("crab"))).toBe("wild");
  });

  it("allies wild NPCs with each other but never with players or pets", () => {
    expect(areAllies(wild("a"), wild("b"))).toBe(true);
    expect(areAllies(wild("a"), player("ann"))).toBe(false);
    expect(areAllies(wild("a"), pet("crab", "ann"))).toBe(false);
  });

  it("allies a pet with its owner and not with strangers", () => {
    expect(areAllies(pet("crab", "ann"), player("ann"))).toBe(true);
    expect(areAllies(pet("crab", "ann"), player("bob"))).toBe(false);
    expect(areAllies(pet("crab", "ann"), pet("slime", "bob"))).toBe(false);
  });

  it("allies party members and their pets", () => {
    const party = (a: string, b: string) => [a, b].sort().join() === "ann,bob";
    expect(areAllies(player("ann"), player("bob"), party)).toBe(true);
    expect(areAllies(pet("crab", "ann"), player("bob"), party)).toBe(true);
    expect(areAllies(pet("crab", "ann"), pet("slime", "bob"), party)).toBe(true);
    expect(areAllies(pet("crab", "ann"), player("cat"), party)).toBe(false);
  });
});
