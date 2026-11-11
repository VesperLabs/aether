import { describe, expect, it } from "vitest";
import type { Dice } from "../random";
import { magicFindBonus, randomDropLevels, rollDrop } from "./item-drops";
import { itemList } from "./item-scaling";

function seededDice(seed: number): Dice {
  let s = seed;
  return {
    random: () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    },
    newId: () => "id",
  };
}

function rollMany(mobLevel: number, magicFind: number, count = 40_000) {
  const dice = seededDice(42);
  const drops = [];
  for (let i = 0; i < count; i++) {
    const drop = rollDrop(dice, mobLevel, magicFind);
    if (drop) drops.push(drop);
  }
  return drops;
}

describe("randomDropLevels", () => {
  it("drops an item from one level below its own up to the spread above", () => {
    expect(randomDropLevels("weapon", "common", "sword")).toEqual({ min: 1, max: 17 });
    expect(randomDropLevels("helmet", "common", "ironArmet")).toEqual({ min: 16, max: 33 });
  });

  it("never drops magic or exclusive items at random", () => {
    expect(randomDropLevels("weapon", "magic", "sword")).toBeUndefined();
    expect(randomDropLevels("weapon", "unique", "eyeOfForest")).toBeUndefined();
  });
});

describe("magicFindBonus", () => {
  it("has diminishing returns and never reaches triple odds", () => {
    expect(magicFindBonus(0)).toBe(0);
    expect(magicFindBonus(250)).toBe(1);
    expect(magicFindBonus(1000) - magicFindBonus(750)).toBeLessThan(magicFindBonus(250));
    expect(magicFindBonus(1_000_000)).toBeLessThan(2);
  });
});

describe("rollDrop", () => {
  it("only gives items in the monster's level range", () => {
    for (const drop of rollMany(30, 0)) {
      const level =
        itemList[drop.type][
          drop.rarity === "magic" || drop.rarity === "rare" ? "common" : drop.rarity
        ][drop.key].level;
      expect(level).toBeLessThanOrEqual(31);
      expect(level).toBeGreaterThanOrEqual(30 - 16);
    }
  });

  it("drops something about one kill in eighteen, mostly common and magic", () => {
    const drops = rollMany(10, 0);
    const rate = drops.length / 40_000;
    expect(rate).toBeGreaterThan(0.03);
    expect(rate).toBeLessThan(0.07);
    const rares = drops.filter((d) => d.rarity === "rare").length;
    expect(rares / drops.length).toBeLessThan(0.15);
  });

  it("finds more rares with magic find", () => {
    const rares = (mf: number) => rollMany(10, mf).filter((d) => d.rarity === "rare").length;
    expect(rares(250)).toBeGreaterThan(rares(0) * 1.5);
  });
});
