import { describe, expect, it } from "vitest";
import { flee, seek, separate, steerWithSeparation } from ".";

describe("steering", () => {
  it("seeks and flees at full speed", () => {
    expect(seek({ x: 0, y: 0 }, { x: 10, y: 0 }, 50)).toEqual({ vx: 50, vy: 0 });
    const away = flee({ x: 0, y: 0 }, { x: 10, y: 0 }, 50);
    expect(away.vx).toBe(-50);
  });

  it("pushes away from close neighbours only", () => {
    const self = { x: 0, y: 0 };
    expect(separate(self, [{ x: 100, y: 0 }], 16)).toEqual({ vx: 0, vy: 0 });
    expect(separate(self, [{ x: 8, y: 0 }], 16).vx).toBeLessThan(0);
  });

  it("keeps the base speed when separating", () => {
    const steered = steerWithSeparation({ vx: 50, vy: 0 }, { vx: 0, vy: 1 }, 25);
    expect(Math.hypot(steered.vx, steered.vy)).toBeCloseTo(50);
    expect(steered.vy).toBeGreaterThan(0);
  });
});
