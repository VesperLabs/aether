import { describe, expect, it } from "vitest";
import { newStickAim, stepStickAim } from "./stick-aim";

describe("stepStickAim", () => {
  it("ignores a light lean", () => {
    expect(stepStickAim(newStickAim(), 0.3, 0, 0, 0.35)).toBeNull();
  });

  it("aims at once on the first push", () => {
    expect(stepStickAim(newStickAim(), 0, 1, 0, 0.35)).toBeCloseTo(Math.PI / 2);
  });

  it("keeps the aim while the stick springs back past the other side", () => {
    const aim = newStickAim();
    stepStickAim(aim, 1, 0, 0, 0.35);
    stepStickAim(aim, 0.5, 0, 16, 0.35);
    expect(stepStickAim(aim, -0.4, 0, 32, 0.35)).toBe(0);
    expect(stepStickAim(aim, 0, 0, 48, 0.35)).toBe(0);
  });

  it("eases toward a new direction rather than jumping", () => {
    const aim = newStickAim();
    stepStickAim(aim, 1, 0, 0, 0.35);
    const angle = stepStickAim(aim, 0, 1, 16, 0.35) as number;
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(Math.PI / 2);
  });
});
