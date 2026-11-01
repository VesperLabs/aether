import { describe, expect, it } from "vitest";
import { LUNGE_DISTANCE, LUNGE_DURATION, getLungeVelocity, isLunging } from "./lunge";

describe("the lunge", () => {
  it("lasts its duration from when it started", () => {
    const state = { lungeAt: 1000 };
    expect(isLunging(state, 1000)).toBe(true);
    expect(isLunging(state, 1000 + LUNGE_DURATION - 1)).toBe(true);
    expect(isLunging(state, 1000 + LUNGE_DURATION)).toBe(false);
    expect(isLunging({}, 1000)).toBe(false);
  });

  it("covers its distance over its duration", () => {
    const { x, y } = getLungeVelocity(0);
    expect(x * (LUNGE_DURATION / 1000)).toBeCloseTo(LUNGE_DISTANCE);
    expect(y).toBeCloseTo(0);
  });
});
