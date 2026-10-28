import { describe, expect, it } from "vitest";
import { WALK_ACCELERATION_SECONDS, approachVelocity, getWalkVelocity } from "./walking";

describe("getWalkVelocity", () => {
  it("is no faster on diagonals", () => {
    const v = getWalkVelocity({ x: 1, y: 1 }, 100);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(100);
  });

  it("keeps partial joystick input partial", () => {
    expect(getWalkVelocity({ x: 0.5, y: 0 }, 100)).toEqual({ x: 50, y: 0 });
  });

  it("is zero with no input", () => {
    expect(getWalkVelocity({ x: 0, y: 0 }, 100)).toEqual({ x: 0, y: 0 });
  });
});

describe("approachVelocity", () => {
  it("reaches full speed after the acceleration time", () => {
    const half = approachVelocity(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      100,
      WALK_ACCELERATION_SECONDS / 2,
    );
    expect(half.x).toBeCloseTo(50);
    const full = approachVelocity(half, { x: 100, y: 0 }, 100, WALK_ACCELERATION_SECONDS);
    expect(full).toEqual({ x: 100, y: 0 });
  });

  it("stops faster than it starts", () => {
    const step = 0.02;
    const starting = approachVelocity({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, step);
    const stopping = approachVelocity({ x: 100, y: 0 }, { x: 0, y: 0 }, 100, step);
    expect(100 - stopping.x).toBeGreaterThan(starting.x);
  });
});
