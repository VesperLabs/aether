import { describe, expect, it } from "vitest";
import {
  calculateElementalDamage,
  calculateStealthVisibilityPercent,
  calculateWeaponDamage,
  rollAttack,
  rollTriggers,
} from "./index";

const attacker = {
  sp: 30,
  maxSp: 30,
  minDamage: 10,
  maxDamage: 10,
  accuracy: 0,
  armorPierce: 1,
  critChance: 0,
};
const victim = { defense: 1, dodgeChance: 0, blockChance: 0 };

describe("calculateElementalDamage", () => {
  it("rolls each range and reduces by resistance, holy ignores it", () => {
    const result = calculateElementalDamage(
      {
        minFireDamage: 10,
        maxFireDamage: 10,
        minWaterDamage: 4,
        maxWaterDamage: 4,
        minHolyDamage: 6,
        maxHolyDamage: 6,
      },
      { fireResistance: 50, waterResistance: 100, holyResistance: 100 },
      () => 0,
    );
    expect(result).toEqual({ eleDamage: 5, holyDamage: 6, elements: ["fire"] });
  });

  it("orders elements strongest first", () => {
    const result = calculateElementalDamage(
      { minFireDamage: 2, maxFireDamage: 2, minEarthDamage: 9, maxEarthDamage: 9 },
      {},
      () => 0,
    );
    expect(result.elements).toEqual(["earth", "fire"]);
    expect(result.eleDamage).toBe(11);
  });

  it("rolls inside the range from the rng", () => {
    const low = calculateElementalDamage({ minFireDamage: 1, maxFireDamage: 5 }, {}, () => 0);
    const high = calculateElementalDamage({ minFireDamage: 1, maxFireDamage: 5 }, {}, () => 0.99);
    expect([low.eleDamage, high.eleDamage]).toEqual([1, 5]);
  });
});

describe("calculateWeaponDamage", () => {
  it("rolls between min and max whatever the sp", () => {
    const stats = { sp: 0, maxSp: 30, minDamage: 10, maxDamage: 20 };
    expect(calculateWeaponDamage(stats, () => 0)).toBe(10);
    expect(calculateWeaponDamage(stats, () => 0.99)).toBe(20);
  });
});

describe("rollAttack", () => {
  it("misses when the dodge roll is under the dodge chance minus accuracy", () => {
    expect(rollAttack(attacker, { ...victim, dodgeChance: 100 }, undefined, () => 0)).toEqual({
      outcome: "miss",
    });
    expect(
      rollAttack(
        { ...attacker, accuracy: 100 },
        { ...victim, dodgeChance: 100 },
        undefined,
        () => 0,
      ).outcome,
    ).toBe("hit");
  });

  it("blocks when the block roll is under the block chance", () => {
    expect(rollAttack(attacker, { ...victim, blockChance: 100 }, undefined, () => 0)).toEqual({
      outcome: "block",
    });
  });

  it("hits for the weapon damage, physical first", () => {
    expect(rollAttack(attacker, victim, undefined, () => 0.5)).toEqual({
      outcome: "hit",
      isCritical: false,
      physicalDamage: 10,
      eleDamage: 0,
      elements: ["physical"],
      totalDamage: 10,
    });
  });

  it("reduces damage by defense over armor pierce, at least 1", () => {
    const result = rollAttack(
      { ...attacker, armorPierce: 10 },
      { ...victim, defense: 20 },
      undefined,
      () => 0.5,
    );
    expect(result).toMatchObject({ physicalDamage: 5 });
    const tiny = rollAttack(attacker, { ...victim, defense: 1000 }, undefined, () => 0.5);
    expect(tiny).toMatchObject({ physicalDamage: 1 });
  });

  it("crits with the multiplier", () => {
    const result = rollAttack(
      { ...attacker, critChance: 100, critMultiplier: 2 },
      victim,
      undefined,
      () => 0,
    );
    expect(result).toMatchObject({ isCritical: true, physicalDamage: 20, totalDamage: 20 });
  });

  it("adds attack-spell effects as elemental damage", () => {
    const result = rollAttack(
      attacker,
      { ...victim, fireResistance: 50 },
      { minFireDamage: 5, maxFireDamage: 5 },
      () => 0.5,
    );
    expect(result).toMatchObject({
      eleDamage: 2,
      elements: ["physical", "fire"],
      totalDamage: 12,
    });
  });

  it("adds holy damage from gear, ignoring resistances", () => {
    const result = rollAttack(
      { ...attacker, minHolyDamage: 2, maxHolyDamage: 2 },
      { ...victim, fireResistance: 100, lightResistance: 100 },
      undefined,
      () => 0.5,
    );
    expect(result).toMatchObject({
      eleDamage: 2,
      elements: ["physical", "holy"],
      totalDamage: 12,
    });
  });

  it("rolls dodge, block and crit in that order before anything else", () => {
    const calls: number[] = [];
    let i = 0;
    rollAttack({ ...attacker, critChance: 50 }, victim, undefined, () => {
      calls.push(i++);
      return 0.99;
    });
    expect(calls.length).toBe(3);
  });
});

describe("rollTriggers", () => {
  const triggers = [
    { event: "onAttackHit", type: "buff", name: "vampire", level: 1, chance: 2 },
    { event: "onAttackHit", type: "debuff", name: "poison", level: 2, chance: 2 },
    { event: "onAttackHit", type: "spell", name: "x", level: 1, chance: 1 },
    { event: "onHurt", type: "buff", name: "guard", level: 1, chance: 1 },
    { event: "onHurt", type: "debuff", name: "slow", level: 1, chance: 1 },
  ];

  it("fires on a roll of 1 and sends buffs to self, debuffs to the other", () => {
    expect(rollTriggers(triggers, "onAttackHit", () => 0)).toEqual([
      { name: "vampire", level: 1, target: "self" },
      { name: "poison", level: 2, target: "other" },
    ]);
  });
  it("doesn't fire on other rolls", () => {
    expect(rollTriggers(triggers, "onAttackHit", () => 0.9)).toEqual([]);
  });
  it("only fires onHurt buffs", () => {
    expect(rollTriggers(triggers, "onHurt", () => 0)).toEqual([
      { name: "guard", level: 1, target: "self" },
    ]);
  });
  it("copes with no triggers", () => {
    expect(rollTriggers(undefined, "onHurt", () => 0)).toEqual([]);
  });
});

describe("calculateStealthVisibilityPercent", () => {
  const base = {
    observer: { stats: { level: 1 } },
    player: { stats: { level: 1 } },
    stealthBuff: { level: 1 },
  };
  it("is invisible at a distance and capped at 0.4 up close", () => {
    expect(calculateStealthVisibilityPercent({ ...base, distance: 100 })).toBe(0);
    expect(calculateStealthVisibilityPercent({ ...base, distance: 0 })).toBe(0.4);
  });
  it("lets a much higher level observer see farther", () => {
    const low = calculateStealthVisibilityPercent({ ...base, distance: 60 });
    const high = calculateStealthVisibilityPercent({
      ...base,
      observer: { stats: { level: 30 } },
      distance: 60,
    });
    expect(high).toBeGreaterThan(low);
  });
});
