import { describe, expect, it } from "vitest";
import { decideNpcAction, type NpcBehaviorInput, type NpcPlayerView } from ".";

const NOW = 1_000_000;

const gone: NpcPlayerView = { socketId: "p1", x: 400, y: 0, isDead: false, stats: { level: 1 } };

/** An orc mid-fight, its foe far out of aggro range. */
function losingFoe(state: Partial<NpcBehaviorInput["state"]> = {}): NpcBehaviorInput {
  return {
    now: NOW,
    time: 5,
    delta: 50,
    npc: {
      x: 100,
      y: 0,
      baseLevel: 5,
      stats: { level: 5, walkSpeed: 50, attackDelay: 300, castDelay: 300 },
      startingCoords: { x: 0, y: 0 },
      talker: null,
      abilities: {},
      buffs: [],
      weapons: {},
      behaviors: { fight: { starts: "onSight" } },
    },
    state: {
      lastAttack: NOW - 10_000,
      lastCast: { global: NOW - 10_000 },
      lockedPlayerId: "p1",
      ...state,
    },
    isStunned: false,
    isNearCollideTile: false,
    isOutOfBounds: false,
    lockedPlayer: gone,
    nearestPlayer: gone,
  };
}

describe("losing its foe", () => {
  it("walks home to heal, as after a leash", () => {
    const decision = decideNpcAction(losingFoe(), () => 0.99);
    expect(decision.lockedPlayerId).toBeNull();
    expect(decision.startReset).toBe(true);
  });

  it("one that retreated stays hurt rather than heal off its getaway", () => {
    const decision = decideNpcAction(losingFoe({ retreatAt: NOW - 1000 }), () => 0.99);
    expect(decision.startReset).toBeUndefined();
  });

  it("one that never fights doesn't heal when hit (the hit locks on, the passive drops it)", () => {
    const passive = losingFoe();
    passive.npc.behaviors = { fight: false, wander: {} };
    const decision = decideNpcAction(passive, () => 0.99);
    expect(decision.lockedPlayerId).toBeNull();
    expect(decision.startReset).toBeUndefined();
  });

  it("an owned NPC stays with its owner instead", () => {
    const decision = decideNpcAction(losingFoe({ ownerId: "owner" }), () => 0.99);
    expect(decision.startReset).toBeUndefined();
  });
});
