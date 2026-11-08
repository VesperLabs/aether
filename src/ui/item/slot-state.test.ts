import { describe, expect, it } from "vitest";
import { sameRequirementInputs } from "./slot-state";

const hero = (stats: Record<string, number>, rest: Record<string, unknown> = {}) => ({
  charClass: "warrior",
  activeItemSlots: ["handRight"],
  stats: { level: 4, strength: 10, hp: 50, mp: 20, sp: 30, maxHp: 80, ...stats },
  ...rest,
});

describe("sameRequirementInputs", () => {
  it("ignores the hp, mp and sp each tick moves", () => {
    expect(sameRequirementInputs(hero({}), hero({ hp: 12, mp: 3, sp: 0 }))).toBe(true);
  });

  it("sees a level up or a stat change", () => {
    expect(sameRequirementInputs(hero({}), hero({ level: 5 }))).toBe(false);
    expect(sameRequirementInputs(hero({}), hero({ strength: 11 }))).toBe(false);
    expect(sameRequirementInputs(hero({}), hero({ maxHp: 90 }))).toBe(false);
  });

  it("sees a class or gear change", () => {
    expect(sameRequirementInputs(hero({}), hero({}, { charClass: "mage" }))).toBe(false);
    expect(sameRequirementInputs(hero({}), hero({}, { activeItemSlots: [] }))).toBe(false);
  });
});
