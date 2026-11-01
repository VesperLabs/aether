import { describe, expect, it } from "vitest";
import { NPC_LUNGE_DISTANCE, NPC_LUNGE_MS, NPC_LUNGE_RECOVERY_MS } from "./constants";
import { decideLungeMovement, getLungeVelocity, isRecoveringFromLunge } from "./lunge";

describe("npc lunges", () => {
  const state = { lungeAt: 1000, lungeAngle: Math.PI / 2 };

  it("dashes along its angle while the lunge lasts", () => {
    expect(decideLungeMovement(state, 1000)).toEqual({ type: "lunge", angle: Math.PI / 2 });
    expect(decideLungeMovement(state, 1000 + NPC_LUNGE_MS - 1)?.type).toBe("lunge");
  });

  it("stands still to recover after the dash, then lets the npc decide again", () => {
    expect(decideLungeMovement(state, 1000 + NPC_LUNGE_MS)).toEqual({ type: "standStill" });
    const done = 1000 + NPC_LUNGE_MS + NPC_LUNGE_RECOVERY_MS;
    expect(isRecoveringFromLunge(state, done - 1)).toBe(true);
    expect(decideLungeMovement(state, done)).toBeUndefined();
  });

  it("never lunges without having started one", () => {
    expect(decideLungeMovement({}, 1000)).toBeUndefined();
  });

  it("covers the lunge distance over the lunge time", () => {
    const { vx, vy } = getLungeVelocity(0);
    expect(vx * (NPC_LUNGE_MS / 1000)).toBeCloseTo(NPC_LUNGE_DISTANCE);
    expect(vy).toBeCloseTo(0);
  });
});
