import { describe, expect, it } from "vitest";
import { LUNGE_MAX_DISTANCE, LUNGE_SPEED } from "@/rules/movement";
import { NPC_POUNCE_STOP_SHORT } from "./constants";
import { isRecoveringFromLunge } from "./lunge";
import { aimPounce } from "./pounce";

describe("aimPounce", () => {
  it("leaps straight at a target standing still, landing just short", () => {
    const { angle, ms } = aimPounce({ x: 0, y: 0 }, { x: 60, y: 0 });
    expect(angle).toBeCloseTo(0);
    expect(ms).toBeCloseTo(((60 - NPC_POUNCE_STOP_SHORT) / LUNGE_SPEED) * 1000);
  });

  it("leads a target running sideways", () => {
    const { angle } = aimPounce({ x: 0, y: 0 }, { x: 60, y: 0, vx: 0, vy: 100 });
    expect(angle).toBeGreaterThan(0.2);
  });

  it("never leaps past a full lunge", () => {
    const { ms } = aimPounce({ x: 0, y: 0 }, { x: 500, y: 0 });
    expect(ms).toBeLessThanOrEqual((LUNGE_MAX_DISTANCE / LUNGE_SPEED) * 1000);
  });
});

describe("landing a pounce", () => {
  it("skips the recovery a tackle leaves it in", () => {
    const pounce = { lungeAt: 0, lungeMs: 200, isPounce: true };
    expect(isRecoveringFromLunge(pounce, 250)).toBe(false);
    expect(isRecoveringFromLunge({ ...pounce, isPounce: false }, 250)).toBe(true);
  });
});
