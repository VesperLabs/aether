import { describe, expect, it } from "vitest";
import {
  STEP_IN_DURATION,
  STEP_IN_MAX_DISTANCE,
  getStepInDistance,
  getStepInVelocity,
  isSteppingIn,
} from "./step-in";

describe("step-in", () => {
  it("surges up to the target, never into it and never past its cap", () => {
    expect(getStepInDistance(-4)).toBe(0);
    expect(getStepInDistance(10)).toBe(10);
    expect(getStepInDistance(500)).toBe(STEP_IN_MAX_DISTANCE);
  });

  it("covers its distance, fast at first and easing to a stop", () => {
    const steps = 1000;
    const dt = STEP_IN_DURATION / steps;
    let x = 0;
    for (let i = 0; i < steps; i++) x += (getStepInVelocity(0, 20, i * dt).x * dt) / 1000;
    expect(x).toBeCloseTo(20, 0);
    const start = getStepInVelocity(0, 20, 0).x;
    const late = getStepInVelocity(0, 20, STEP_IN_DURATION * 0.9).x;
    expect(late).toBeLessThan(start / 5);
  });

  it("only lasts its duration, and not at all for no distance", () => {
    const state = { stepInAt: 1000, stepInDistance: 20 };
    expect(isSteppingIn(state, 1000)).toBe(true);
    expect(isSteppingIn(state, 1000 + STEP_IN_DURATION)).toBe(false);
    expect(isSteppingIn({ stepInAt: 1000, stepInDistance: 0 }, 1000)).toBe(false);
  });
});
