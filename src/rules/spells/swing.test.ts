import { describe, expect, it } from "vitest";
import { HAND_REACH, getAttackHandOffset } from "@/content";
import { shapesOverlap } from "../movement";
import { getSwingActiveMs, getSwingShape, planSwing, type SwingInput } from "./swing";

const sword: SwingInput = {
  direction: "right",
  action: "attack_right",
  race: "human",
  reach: 40,
  hasWeaponRange: true,
  isPunching: false,
  isUppercut: false,
  bodyPivotY: -12,
  visibleMs: 200,
};
const caster = { x: 100, y: 100 };
const target = (x: number, y: number) => ({
  kind: "box" as const,
  x,
  y,
  halfWidth: 3,
  halfHeight: 3,
});

describe("planSwing", () => {
  it("turns around the swinging hand, reaching the blade past it", () => {
    const plan = planSwing(sword);
    expect(plan.pivot).toEqual(getAttackHandOffset("human", "right", "attack_right", "handRight"));
    expect(plan.radius).toBe(40 - HAND_REACH);
  });

  it("turns around the body for a character with no hand frames", () => {
    const plan = planSwing({ ...sword, race: "wolf", hasWeaponRange: false });
    expect(plan.pivot).toEqual({ x: 0, y: -12 });
    expect(plan.radius).toBe(40);
  });

  it("punches straight ahead all at once", () => {
    const plan = planSwing({ ...sword, isPunching: true });
    expect(plan.sweepMs).toBe(0);
    expect(plan.degrees).toBeLessThan(90);
  });

  it("stays active until the blade is done", () => {
    const plan = planSwing({ ...sword, visibleMs: 1000 });
    expect(getSwingActiveMs(plan, 120)).toBeCloseTo(plan.sweepMs);
  });
});

describe("getSwingShape", () => {
  const plan = planSwing(sword);
  const hand = plan.pivot;
  /* Facing right, a blade comes down: it starts up and to the right and ends down and right */
  const above = target(caster.x + hand.x + 4, caster.y + hand.y - 18);
  const below = target(caster.x + hand.x + 4, caster.y + hand.y + 18);

  it("only reaches what the blade has swept so far", () => {
    const early = getSwingShape(plan, caster, 0);
    expect(shapesOverlap(early, above)).toBe(true);
    expect(shapesOverlap(early, below)).toBe(false);
  });

  it("covers the whole arc once the blade is done", () => {
    const done = getSwingShape(plan, caster, plan.sweepMs);
    expect(shapesOverlap(done, above)).toBe(true);
    expect(shapesOverlap(done, below)).toBe(true);
  });

  it("never hits behind the swing", () => {
    const done = getSwingShape(plan, caster, plan.sweepMs);
    expect(shapesOverlap(done, target(caster.x - 20, caster.y + hand.y))).toBe(false);
  });

  it("sweeps the other way for a left-hand swing facing down", () => {
    const left = planSwing({ ...sword, direction: "down", action: "attack_left" });
    const right = planSwing({ ...sword, direction: "down", action: "attack_right" });
    expect(left.turn).toBe(-right.turn);
  });
});
