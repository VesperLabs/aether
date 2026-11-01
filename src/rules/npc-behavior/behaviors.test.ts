import { describe, expect, it } from "vitest";
import { decideNpcAction, type NpcBehaviorInput, type NpcPlayerView } from ".";

const NOW = 1_000_000;
const never = () => 0.99;

const player = (over: Partial<NpcPlayerView> = {}): NpcPlayerView => ({
  socketId: "p1",
  x: 100,
  y: 0,
  isDead: false,
  stats: { level: 1 },
  ...over,
});

function input(over: {
  npc?: Partial<NpcBehaviorInput["npc"]>;
  state?: Partial<NpcBehaviorInput["state"]>;
  rest?: Partial<NpcBehaviorInput>;
}): NpcBehaviorInput {
  return {
    now: NOW,
    time: 5,
    delta: 50,
    npc: {
      x: 0,
      y: 0,
      baseLevel: 5,
      stats: { level: 5, walkSpeed: 50, attackDelay: 300, castDelay: 300 },
      startingCoords: { x: 0, y: 0 },
      hasTalkers: false,
      abilities: {},
      buffs: [],
      weapons: {},
      ...over.npc,
    },
    state: {
      isAggro: true,
      lastAttack: NOW - 10_000,
      lastCast: { global: NOW - 10_000 },
      npcAttackReady: false,
      ...over.state,
    },
    isStunned: false,
    isNearCollideTile: false,
    isOutOfBounds: false,
    ...over.rest,
  };
}

describe("threat, leash and new behaviors", () => {
  it("fights the threat target over the nearest player", () => {
    const tank = player({ socketId: "tank", x: 60 });
    const decision = decideNpcAction(
      input({ rest: { nearestPlayer: player({ x: 20 }), threatTarget: tank } }),
      never,
    );
    expect(decision.lockedPlayerId).toBe("tank");
    expect(decision.behavior).toBe("chase");
  });

  it("gives up and walks home when pulled past its leash", () => {
    const far = player({ x: 900 });
    const decision = decideNpcAction(
      input({
        npc: { x: 800 },
        state: { lockedPlayerId: "p1" },
        rest: { lockedPlayer: far, nearestPlayer: far },
      }),
      never,
    );
    expect(decision.startReset).toBe(true);
    expect(decision.lockedPlayerId).toBeNull();
    expect(decision.movement).toEqual({ type: "returnToSpawn", pathed: true });
  });

  it("ignores players while resetting, and finishes once home", () => {
    const close = player({ x: 10 });
    const walking = decideNpcAction(
      input({ npc: { x: 300 }, state: { isResetting: true }, rest: { nearestPlayer: close } }),
      never,
    );
    expect(walking.lockedPlayerId).toBeNull();
    expect(walking.behavior).toBe("reset");
    const home = decideNpcAction(
      input({ state: { isResetting: true }, rest: { nearestPlayer: close } }),
      never,
    );
    expect(home.finishReset).toBe(true);
  });

  it("retreats when badly hurt, if it can", () => {
    const hurt = (behaviors?: NpcBehaviorInput["npc"]["behaviors"]) =>
      decideNpcAction(
        input({
          npc: {
            behaviors,
            stats: { level: 5, walkSpeed: 50, attackDelay: 300, castDelay: 300, hp: 1, maxHp: 10 },
          },
          rest: { nearestPlayer: player({ x: 50 }) },
        }),
        never,
      );
    expect(hurt().behavior).toBe("chase");
    expect(hurt(["retreat", "chase", "wander"]).movement).toEqual({ type: "flee" });
  });

  it("kites with a ranged weapon when the target gets close", () => {
    const decision = decideNpcAction(
      input({
        npc: { behaviors: ["kite", "chase", "wander"], weapons: { handLeft: { range: 150 } } },
        rest: { nearestPlayer: player({ x: 30 }) },
      }),
      never,
    );
    expect(decision.movement).toEqual({ type: "flee" });
  });

  it("follows its leader, waiting when close", () => {
    const follow = (x: number) =>
      decideNpcAction(
        input({
          npc: { behaviors: ["chase", "follow", "wander"] },
          state: { isAggro: false },
          rest: { leader: { x, y: 0 } },
        }),
        never,
      ).movement;
    expect(follow(200)).toEqual({ type: "follow", pathed: false });
    expect(follow(20)).toEqual({ type: "standStill" });
  });
});
