import { describe, expect, it } from "vitest";
import { beginCast, getCastFacing, isCastRooted, stepCast } from "./casting";

const ready = { isCasting: false, isMoving: false, canAfford: true, roomName: "town", castMs: 500 };

describe("beginCast", () => {
  it("starts a cast that lands after its cast time", () => {
    expect(beginCast(1, ready, 1000)).toEqual({ abilitySlot: 1, landsAt: 1500, roomName: "town" });
  });

  it.each([
    ["already casting", { isCasting: true }],
    ["moving", { isMoving: true }],
    ["short of the cost", { canAfford: false }],
    ["outside a room", { roomName: undefined }],
    ["an instant spell", { castMs: undefined }],
  ])("refuses a caster who is %s", (_, change) => {
    expect(beginCast(1, { ...ready, ...change }, 0)).toBeUndefined();
  });
});

describe("stepCast", () => {
  const cast = { abilitySlot: 1, landsAt: 500, roomName: "town" };
  const caster = { isStunned: false, roomName: "town" };

  it("waits, then lands", () => {
    expect(stepCast(cast, caster, 499)).toBe("wait");
    expect(stepCast(cast, caster, 500)).toBe("land");
  });

  it("is called off by death, a stun or leaving the room", () => {
    expect(stepCast(cast, { ...caster, isDead: true }, 0)).toBe("cancel");
    expect(stepCast(cast, { ...caster, isStunned: true }, 0)).toBe("cancel");
    expect(stepCast(cast, { ...caster, roomName: "cave" }, 0)).toBe("cancel");
  });
});

describe("casting roots and turns", () => {
  it("roots only while casting", () => {
    expect(isCastRooted(undefined)).toBe(false);
    expect(isCastRooted({ abilitySlot: 1, landsAt: 0 })).toBe(true);
  });

  it("faces the way the aim points", () => {
    expect(getCastFacing(0)).toBe("right");
    expect(getCastFacing(Math.PI / 2)).toBe("down");
    expect(getCastFacing(Math.PI)).toBe("left");
    expect(getCastFacing(-Math.PI / 2)).toBe("up");
  });
});
