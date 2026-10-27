import { describe, expect, it } from "vitest";
import { modifyStat } from ".";

describe("modifyStat", () => {
  it("clamps between 0 and the max", () => {
    expect(modifyStat({ hp: 5, maxHp: 10 }, "hp", 20)).toBe(10);
    expect(modifyStat({ hp: 5, maxHp: 10 }, "hp", -20)).toBe(0);
    expect(modifyStat({ hp: 5, maxHp: 10 }, "hp", 2)).toBe(7);
  });

  it("leaves a missing or non-numeric stat alone", () => {
    expect(modifyStat({ maxHp: 10 }, "hp", 2)).toBeUndefined();
    expect(modifyStat({ hp: NaN, maxHp: 10 }, "hp", 2)).toBeUndefined();
    expect(modifyStat({ hp: 5 }, "hp", 2)).toBeUndefined();
  });
});
