import { describe, expect, it } from "vitest";
import { getCatchChance, isCatchable, rollCatch } from "./rules";

describe("getCatchChance", () => {
  it("is each ball's catch chance: 25% up to a Master Ball that always catches", () => {
    expect([1, 2, 3, 4].map(getCatchChance)).toEqual([0.25, 0.5, 0.75, 1]);
  });

  it("treats a missing or out-of-range level as the nearest ball", () => {
    expect(getCatchChance(undefined)).toBe(getCatchChance(1));
    expect(getCatchChance(0)).toBe(getCatchChance(1));
    expect(getCatchChance(9)).toBe(1);
  });
});

describe("rollCatch", () => {
  it("catches when the roll is under the ball's chance", () => {
    expect(rollCatch(() => 0.2, 1)).toBe(true);
    expect(rollCatch(() => 0.7, 1)).toBe(false);
    expect(rollCatch(() => 0.999, 4)).toBe(true);
  });
});

describe("isCatchable", () => {
  it("takes only living, wild NPCs not marked uncatchable", () => {
    expect(isCatchable({ isPlayer: false })).toBe(true);
    expect(isCatchable({ isPlayer: true })).toBe(false);
    expect(isCatchable({ isPlayer: false, ownerId: "p1" })).toBe(false);
    expect(isCatchable({ isPlayer: false, isDead: true })).toBe(false);
    expect(isCatchable({ isPlayer: false, catchable: false })).toBe(false);
  });
});
