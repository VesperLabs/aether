import { describe, expect, it } from "vitest";
import {
  LUNGE_DISTANCE,
  LUNGE_DURATION,
  LUNGE_MAX_DISTANCE,
  LUNGE_OVERSHOOT,
  getLungeDuration,
  getLungeVelocity,
  isLunging,
} from "./lunge";

describe("the lunge", () => {
  it("lasts its duration from when it started", () => {
    const state = { lungeAt: 1000 };
    expect(isLunging(state, 1000)).toBe(true);
    expect(isLunging(state, 1000 + LUNGE_DURATION - 1)).toBe(true);
    expect(isLunging(state, 1000 + LUNGE_DURATION)).toBe(false);
    expect(isLunging({}, 1000)).toBe(false);
  });

  it("reaches just past an aimed target, within its limits", () => {
    const pixelsFor = (distance?: number) => {
      const { x } = getLungeVelocity(0);
      return (x * getLungeDuration(distance)) / 1000;
    };
    expect(pixelsFor()).toBeCloseTo(LUNGE_DISTANCE);
    expect(pixelsFor(70)).toBeCloseTo(70 + LUNGE_OVERSHOOT);
    expect(pixelsFor(500)).toBeCloseTo(LUNGE_MAX_DISTANCE);
    expect(pixelsFor(0)).toBeCloseTo(LUNGE_DISTANCE / 2);
    expect(isLunging({ lungeAt: 0, lungeMs: 250 }, 249)).toBe(true);
  });

  it("covers its distance over its duration", () => {
    const { x, y } = getLungeVelocity(0);
    expect(x * (LUNGE_DURATION / 1000)).toBeCloseTo(LUNGE_DISTANCE);
    expect(y).toBeCloseTo(0);
  });
});
