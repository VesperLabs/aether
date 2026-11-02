import { describe, expect, it } from "vitest";
import {
  KNOCKBACK_DISTANCE,
  KNOCKBACK_DURATION,
  getKnockbackVelocity,
  isKnockedBack,
} from "./knockback";

describe("knockback", () => {
  it("lasts its duration from when it started", () => {
    const state = { knockbackAt: 1000 };
    expect(isKnockedBack(state, 999)).toBe(false);
    expect(isKnockedBack(state, 1000)).toBe(true);
    expect(isKnockedBack(state, 1000 + KNOCKBACK_DURATION)).toBe(false);
    expect(isKnockedBack({}, 1000)).toBe(false);
  });

  it("starts fast, stops at the end and covers its distance", () => {
    const start = Math.hypot(...Object.values(getKnockbackVelocity(0, 0)));
    expect(getKnockbackVelocity(0, KNOCKBACK_DURATION).x).toBe(0);
    let covered = 0;
    for (let ms = 0; ms < KNOCKBACK_DURATION; ms++)
      covered += getKnockbackVelocity(0, ms + 0.5).x / 1000;
    expect(covered).toBeCloseTo(KNOCKBACK_DISTANCE, 0);
    expect(start).toBeGreaterThan(KNOCKBACK_DISTANCE / (KNOCKBACK_DURATION / 1000));
  });

  it("pushes along its angle", () => {
    const { x, y } = getKnockbackVelocity(Math.PI / 2, 0);
    expect(Math.abs(x)).toBeLessThan(1e-9);
    expect(y).toBeGreaterThan(0);
  });
});
