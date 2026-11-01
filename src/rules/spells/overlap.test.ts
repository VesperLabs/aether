import { describe, expect, it } from "vitest";
import { getAimAngle } from "./overlap";

describe("getAimAngle", () => {
  it("aims from the caster's body centre at the middle of the target's hit box", () => {
    const target = { x: 100, y: 0, bodySize: 8, hitBoxSize: { width: 16, height: 32 } };
    // Hit box middle is at y = 8 - 16 = -8; a short caster's shot starts at y = 4
    const angle = getAimAngle({ x: 0, y: 0, bodyCenterY: 4 }, target);
    expect(angle).toBeCloseTo(Math.atan2(-12, 100));
  });
});

describe("getAimAngle with lead", () => {
  it("aims part of the way toward where a moving target will be", () => {
    const target = {
      x: 100,
      y: 0,
      bodySize: 0,
      hitBoxSize: { width: 0, height: 0 },
      vx: 0,
      vy: 100,
    };
    // 1 second of flight at 100 px/s, half the lead: aim 50px ahead of the target
    const angle = getAimAngle({ x: 0, y: 0, bodyCenterY: 0 }, target, {
      projectileSpeed: 100,
      ratio: 0.5,
    });
    expect(angle).toBeCloseTo(Math.atan2(50, 100));
  });
});
