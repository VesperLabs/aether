import { describe, expect, it } from "vitest";
import {
  WALK_ACCELERATION_SECONDS,
  approachVelocity,
  getWalkVelocity,
  GROUND,
  ICE,
  slideVelocity,
} from "./walking";

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

describe("slideVelocity", () => {
  const walk = 100;

  it("takes the wanted velocity at once with full grip", () => {
    expect(slideVelocity({ x: 100, y: 0 }, { x: 0, y: 0 }, 0.016, GROUND, walk)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("slides on when it lets go on ice, slowing a little each step", () => {
    const next = slideVelocity({ x: 100, y: 0 }, { x: 0, y: 0 }, 0.016, ICE, walk);
    expect(next.x).toBeGreaterThan(95);
    expect(next.x).toBeLessThan(100);
  });

  it("glides faster than walking on ice", () => {
    let velocity = { x: 0, y: 0 };
    for (let i = 0; i < 100; i++)
      velocity = slideVelocity(velocity, { x: walk, y: 0 }, 0.016, ICE, walk);
    expect(velocity.x).toBeCloseTo(walk * ICE.speedScale);
  });

  it("turns slowly on ice", () => {
    const next = slideVelocity({ x: 100, y: 0 }, { x: 0, y: 100 }, 0.016, ICE, walk);
    expect(next.x).toBeGreaterThan(next.y);
  });

  it("takes a shove at once, even on ice", () => {
    const shove = { x: 400, y: 0 };
    expect(slideVelocity({ x: 0, y: 0 }, shove, 0.016, ICE, walk)).toEqual(shove);
  });
});
