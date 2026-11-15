import { describe, expect, it } from "vitest";
import { decideSwing, getSwingPower } from "./swings";

describe("decideSwing", () => {
  it("melee jabs at once for half damage, or swings in full", () => {
    const jab = decideSwing(false, 200, 400, () => 0.1);
    const heavy = decideSwing(false, 200, 400, () => 0.9);
    expect(jab).toEqual({ swing: "jab", windupMs: 0 });
    expect(heavy).toEqual({ swing: "heavy", windupMs: 600 });
    expect(getSwingPower(jab.swing)).toBe(0.5);
    expect(getSwingPower(heavy.swing)).toBe(1);
  });

  it("ranged shots keep their usual windup and damage", () => {
    const shot = decideSwing(true, 200, 400, () => 0.1);
    expect(shot).toEqual({ windupMs: 600 });
    expect(getSwingPower(shot.swing)).toBe(1);
  });
});
