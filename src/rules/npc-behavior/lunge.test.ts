import { describe, expect, it } from "vitest";
import { LUNGE_DURATION } from "@/rules/movement";
import { NPC_LUNGE_RECOVERY_MS } from "./constants";
import { decideLungeMovement } from "./lunge";

describe("npc lunges", () => {
  const state = { lungeAt: 1000, lungeAngle: Math.PI / 2 };

  it("dash along their angle while the lunge lasts", () => {
    expect(decideLungeMovement(state, 1000)).toEqual({ type: "lunge", angle: Math.PI / 2 });
  });

  it("stand still to recover after the dash, then decide again", () => {
    expect(decideLungeMovement(state, 1000 + LUNGE_DURATION)).toEqual({ type: "standStill" });
    const done = 1000 + LUNGE_DURATION + NPC_LUNGE_RECOVERY_MS;
    expect(decideLungeMovement(state, done - 1)).toEqual({ type: "standStill" });
    expect(decideLungeMovement(state, done)).toBeUndefined();
  });
});
