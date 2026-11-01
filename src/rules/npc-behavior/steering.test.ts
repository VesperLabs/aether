import { describe, expect, it } from "vitest";
import { flee, fleeAround, seek, separate, steerWithSeparation, strafeAround } from ".";

describe("steering", () => {
  it("seeks and flees at full speed", () => {
    expect(seek({ x: 0, y: 0 }, { x: 10, y: 0 }, 50)).toEqual({ vx: 50, vy: 0 });
    const away = flee({ x: 0, y: 0 }, { x: 10, y: 0 }, 50);
    expect(away.vx).toBe(-50);
  });

  it("flees around a wall instead of into it", () => {
    const wallOnLeft = (point: { x: number }) => point.x < -10;
    const away = fleeAround({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, wallOnLeft);
    expect(Math.hypot(away.vx, away.vy)).toBeCloseTo(50);
    expect(Math.abs(away.vy)).toBeGreaterThan(Math.abs(away.vx));
    expect(away.vx).toBeLessThanOrEqual(0.001);
    expect(fleeAround({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, () => false).vx).toBeCloseTo(-50);
  });

  it("keeps to the side of a wall it already picked", () => {
    const wallOnLeft = (point: { x: number }) => point.x < -10;
    const up = fleeAround({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, wallOnLeft, { vx: 0, vy: -50 });
    const down = fleeAround({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, wallOnLeft, { vx: 0, vy: 50 });
    expect(up.vy).toBeLessThan(0);
    expect(down.vy).toBeGreaterThan(0);
  });

  it("treats a heading that clips a corner with its body as blocked", () => {
    // A wall tile whose corner sits just off the straight-away line.
    const corner = (point: { x: number; y: number }) =>
      point.x < -20 && point.y > 4 && point.y < 40;
    const thin = fleeAround({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, corner);
    const wide = fleeAround({ x: 0, y: 0 }, { x: 10, y: 0 }, 50, corner, undefined, 8);
    expect(thin.vx).toBeCloseTo(-50);
    expect(wide.vy).toBeLessThan(0);
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

describe("strafeAround", () => {
  const self = { x: 0, y: 0 };
  const target = { x: 100, y: 0 };

  it("sidesteps at right angles when at the ideal distance", () => {
    const { velocity, clockwise } = strafeAround(
      self,
      target,
      { clockwise: true, distance: 100, speed: 10 },
      () => false,
    );
    expect(clockwise).toBe(true);
    expect(velocity.vx).toBeCloseTo(0);
    expect(velocity.vy).toBeCloseTo(10);
  });

  it("switches sides when blocked, and stops when both are", () => {
    const flipped = strafeAround(
      self,
      target,
      { clockwise: true, distance: 100, speed: 10 },
      (v) => v.vy > 0,
    );
    expect(flipped.clockwise).toBe(false);
    expect(flipped.velocity.vy).toBeCloseTo(-10);
    const stuck = strafeAround(
      self,
      target,
      { clockwise: true, distance: 100, speed: 10 },
      () => true,
    );
    expect(stuck.velocity).toEqual({ vx: 0, vy: 0 });
  });
});
