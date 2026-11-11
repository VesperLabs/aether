import { describe, expect, it } from "vitest";
import {
  behaviorOptions,
  isNpcAggressive,
  isNpcPassive,
  keepsAway,
  mergeBehaviors,
  wanderRadius,
} from "./behavior-options";

const bow = { handLeft: { range: 150 } };

describe("behavior options", () => {
  it("fall back to the defaults: fights back, wanders, guards nothing", () => {
    expect(behaviorOptions({}, "fight")).toEqual({});
    expect(behaviorOptions({}, "wander")).toEqual({});
    expect(behaviorOptions({}, "guard")).toBe(false);
    expect(isNpcAggressive({})).toBe(false);
    expect(isNpcPassive({})).toBe(false);
  });

  it("`false` turns a default off", () => {
    expect(isNpcPassive({ behaviors: { fight: false } })).toBe(true);
    expect(behaviorOptions({ behaviors: { wander: false } }, "wander")).toBe(false);
  });

  it("keeps away by default only when it holds a ranged weapon", () => {
    expect(keepsAway({})).toBe(false);
    expect(keepsAway({ weapons: bow })).toBe(true);
    expect(keepsAway({ weapons: bow, behaviors: { fight: { keepAway: false } } })).toBe(false);
    expect(keepsAway({ behaviors: { fight: { keepAway: true } } })).toBe(true);
    expect(keepsAway({ weapons: bow, behaviors: { fight: false } })).toBe(false);
  });

  it("merges a spawn's options over the actor's, one behavior at a time", () => {
    const merged = mergeBehaviors(
      { fight: { starts: "onSight", fleeBelow: 0.3 }, guard: {} },
      { fight: { starts: "whenHit" }, guard: false, wander: { radius: 40 } },
    );
    expect(merged).toEqual({
      fight: { starts: "whenHit", fleeBelow: 0.3 },
      guard: false,
      wander: { radius: 40 },
    });
    expect(wanderRadius({ behaviors: merged })).toBe(40);
  });
});
