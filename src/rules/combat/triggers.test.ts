import { describe, expect, it } from "vitest";
import { TRIGGER_REFERENCE_SWING_MS, getSwingScale, rollTriggers } from "./triggers";

const triggers = [
  { event: "onAttackHit", type: "buff", name: "vampire", level: 1, percent: 50 },
  { event: "onAttackHit", type: "debuff", name: "poison", level: 2, percent: 50 },
  { event: "onAttackHit", type: "spell", name: "x", level: 1, percent: 100 },
  { event: "onHurt", type: "buff", name: "guard", level: 1, percent: 100 },
  { event: "onHurt", type: "debuff", name: "slow", level: 1, percent: 100 },
];

describe("rollTriggers", () => {
  it("fires on a low roll and sends buffs to self, debuffs to the other", () => {
    expect(rollTriggers(triggers, "onAttackHit", () => 0)).toEqual([
      { name: "vampire", level: 1, target: "self" },
      { name: "poison", level: 2, target: "other" },
    ]);
  });
  it("doesn't fire on a roll above its chance", () => {
    expect(rollTriggers(triggers, "onAttackHit", () => 0.9)).toEqual([]);
  });
  it("only fires onHurt buffs", () => {
    expect(rollTriggers(triggers, "onHurt", () => 0).map((t) => t.name)).toEqual(["guard"]);
  });
  it("copes with no triggers", () => {
    expect(rollTriggers(undefined, "onHurt", () => 0)).toEqual([]);
  });

  it("gives slow swings a bigger chance per hit and fast ones a smaller", () => {
    const one = [{ event: "onAttackHit", type: "buff", name: "haste", level: 1, percent: 20 }];
    const roll = (swingMs: number) => rollTriggers(one, "onAttackHit", () => 0.3, swingMs).length;
    expect(roll(TRIGGER_REFERENCE_SWING_MS)).toBe(0);
    expect(roll(TRIGGER_REFERENCE_SWING_MS * 2)).toBe(1);
  });
});

describe("getSwingScale", () => {
  it("is 1 at the reference swing and capped at half to double", () => {
    expect(getSwingScale(TRIGGER_REFERENCE_SWING_MS)).toBe(1);
    expect(getSwingScale(TRIGGER_REFERENCE_SWING_MS * 10)).toBe(2);
    expect(getSwingScale(10)).toBe(0.5);
    expect(getSwingScale(undefined)).toBe(1);
  });
});
