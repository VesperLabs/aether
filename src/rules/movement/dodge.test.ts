import { describe, expect, it } from "vitest";
import {
  DODGE_COOLDOWN,
  DODGE_DISTANCE,
  DODGE_DURATION,
  DODGE_SP_COST,
  canDodge,
  getDodgeReadiness,
  getDodgeVelocity,
  isDodging,
} from "./dodge";

describe("canDodge", () => {
  const ready = { state: {}, sp: DODGE_SP_COST, isStunned: false, now: 10_000 };

  it("allows a roll with enough sp and no cooldown", () => {
    expect(canDodge(ready)).toBe(true);
  });
  it("needs enough sp", () => {
    expect(canDodge({ ...ready, sp: DODGE_SP_COST - 1 })).toBe(false);
  });
  it("waits for the cooldown", () => {
    const state = { lastDodge: ready.now - DODGE_COOLDOWN + 1 };
    expect(canDodge({ ...ready, state })).toBe(false);
    expect(canDodge({ ...ready, state: { lastDodge: ready.now - DODGE_COOLDOWN } })).toBe(true);
  });
  it("refuses the dead and the stunned", () => {
    expect(canDodge({ ...ready, state: { isDead: true } })).toBe(false);
    expect(canDodge({ ...ready, isStunned: true })).toBe(false);
  });
});

describe("isDodging", () => {
  it("lasts the roll's duration", () => {
    expect(isDodging({ lastDodge: 1000 }, 1000)).toBe(true);
    expect(isDodging({ lastDodge: 1000 }, 1000 + DODGE_DURATION - 1)).toBe(true);
    expect(isDodging({ lastDodge: 1000 }, 1000 + DODGE_DURATION)).toBe(false);
  });
  it("is false before any roll", () => {
    expect(isDodging({}, 1000)).toBe(false);
  });
});

describe("getDodgeVelocity", () => {
  it("covers the roll distance over its duration", () => {
    const { x, y } = getDodgeVelocity(0);
    expect(x * (DODGE_DURATION / 1000)).toBeCloseTo(DODGE_DISTANCE);
    expect(y).toBeCloseTo(0);
  });
});

describe("getDodgeReadiness", () => {
  it("climbs from 0 to 1 over the cooldown", () => {
    expect(getDodgeReadiness({ lastDodge: 0 }, 0)).toBe(0);
    expect(getDodgeReadiness({ lastDodge: 0 }, DODGE_COOLDOWN / 2)).toBeCloseTo(0.5);
    expect(getDodgeReadiness({ lastDodge: 0 }, DODGE_COOLDOWN * 2)).toBe(1);
  });
});
