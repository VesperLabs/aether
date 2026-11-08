import { describe, expect, it } from "vitest";
import { THROW_COOLDOWN, canThrow, getThrowFlight, rollCatch } from "./rules";

const THROW_RANGE = 100;

const npc = (id: string, x: number, y: number) => ({
  id,
  x,
  y,
  bodySize: 8,
  hitBoxSize: { width: 18, height: 46 },
});

describe("getThrowFlight", () => {
  it("hits the first target on the line", () => {
    const flight = getThrowFlight({ x: 0, y: 0 }, 0, [npc("far", 90, 0), npc("near", 60, 0)]);
    expect(flight.target?.id).toBe("near");
    /* The middle of its hit box: x on the body, y half its height up from the feet */
    expect(flight.to).toEqual({ x: 60, y: 8 - 23 });
  });

  it("misses targets off the line and drops at the end of its range", () => {
    const flight = getThrowFlight({ x: 0, y: 0 }, 0, [npc("above", 60, -120)]);
    expect(flight.target).toBeUndefined();
    expect(flight.to).toEqual({ x: THROW_RANGE, y: 0 });
  });

  it("can't reach past its range", () => {
    expect(getThrowFlight({ x: 0, y: 0 }, 0, [npc("far", THROW_RANGE + 40, 0)]).target).toBe(
      undefined,
    );
  });

  it("ignores targets behind the thrower", () => {
    expect(getThrowFlight({ x: 0, y: 0 }, 0, [npc("behind", -60, 0)]).target).toBeUndefined();
  });
});

describe("rollCatch", () => {
  it("catches when the roll is under the chance", () => {
    expect(rollCatch(() => 0.2, 0.5)).toBe(true);
    expect(rollCatch(() => 0.7, 0.5)).toBe(false);
  });
});

describe("canThrow", () => {
  it("waits out the cooldown", () => {
    expect(canThrow(undefined, 0)).toBe(true);
    expect(canThrow(1000, 1000 + THROW_COOLDOWN - 1)).toBe(false);
    expect(canThrow(1000, 1000 + THROW_COOLDOWN)).toBe(true);
  });
});
