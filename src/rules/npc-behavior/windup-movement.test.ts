import { describe, expect, it } from "vitest";
import { decideNpcAction } from ".";
import { NOW, input, never, player } from "./behavior-fixtures";

/* Melee keeps moving through its windup and swing; anything aiming roots. */
describe("moving while attacking", () => {
  it("kiters root while winding up a shot", () => {
    const decision = decideNpcAction(
      input({
        npc: {
          behaviors: { fight: { starts: "onSight", keepAway: true } },
          weapons: { handLeft: { range: 150 } },
        },
        state: { isAiming: true },
        rest: { nearestPlayer: player({ x: 30 }) },
      }),
      never,
    );
    expect(decision.movement).toEqual({ type: "standStill" });
  });

  it("a bow user roots while it aims, even with the target far off", () => {
    const far = player({ x: 140 });
    const decision = decideNpcAction(
      input({
        npc: { weapons: { handLeft: { range: 150 } } },
        state: { lockedPlayerId: "p1", isAiming: true },
        rest: { lockedPlayer: far, nearestPlayer: far },
      }),
      never,
    );
    expect(decision.movement).toEqual({ type: "standStill" });
  });

  it("a melee NPC roots while it winds up a spell", () => {
    const far = player({ x: 60 });
    const decision = decideNpcAction(
      input({
        state: { lockedPlayerId: "p1", isAiming: true, isAimingCast: true },
        rest: { lockedPlayer: far, nearestPlayer: far },
      }),
      never,
    );
    expect(decision.movement).toEqual({ type: "standStill" });
  });

  it("keeps chasing while winding up when the target steps out of reach", () => {
    const decision = decideNpcAction(
      input({
        state: { lockedPlayerId: "p1", isAiming: true },
        rest: { lockedPlayer: player({ x: 60 }), nearestPlayer: player({ x: 60 }) },
      }),
      never,
    );
    expect(decision.movement).toMatchObject({ type: "chase" });
    expect(decision.cancelWindup).toBeUndefined();
  });

  it("walks off mid-swing once the target is dead", () => {
    const dead = player({ x: 20, isDead: true });
    const decision = decideNpcAction(
      input({
        state: { lockedPlayerId: "p1", isAttacking: true, lastAttack: NOW - 100 },
        rest: { lockedPlayer: dead, nearestPlayer: dead },
      }),
      never,
    );
    expect(decision.lockedPlayerId).toBeNull();
    expect(decision.movement).not.toEqual({ type: "standStill" });
  });
});
