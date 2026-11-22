import { describe, expect, it } from "vitest";
import { decideNpcAction, type NpcBehaviorInput, type NpcPlayerView } from ".";

const NOW = 1_000_000;
const never = () => 0.99;

const player = (x: number): NpcPlayerView => ({
  socketId: "p1",
  x,
  y: 0,
  isDead: false,
  stats: { level: 1 },
});

const bird = (
  nearestPlayer: NpcPlayerView | null,
  state: Partial<NpcBehaviorInput["state"]> = {},
): NpcBehaviorInput => ({
  now: NOW,
  time: 5,
  delta: 50,
  npc: {
    x: 0,
    y: 0,
    baseLevel: 1,
    stats: { level: 1, walkSpeed: 50, attackDelay: 300, castDelay: 300 },
    startingCoords: { x: 0, y: 0 },
    talker: null,
    abilities: {},
    buffs: [],
    weapons: {},
    behaviors: { fight: false, wander: {}, skittish: { to: "air" } },
  },
  state: { lastAttack: 0, lastCast: { global: 0 }, ...state },
  isStunned: false,
  isNearCollideTile: false,
  isOutOfBounds: false,
  nearestPlayer,
});

describe("skittish", () => {
  it("wanders in its first habitat while nobody is near", () => {
    const decision = decideNpcAction(bird(player(500)), never);
    expect(decision.behavior).toBe("wander");
    expect(decision.habitat).toBeUndefined();
  });

  it("takes off and makes for a spot well away from a player who comes near", () => {
    const decision = decideNpcAction(bird(player(30)), () => 0.5);
    expect(decision.behavior).toBe("skittish");
    expect(decision.habitat).toBe("air");
    expect(decision.movement).toMatchObject({ type: "escape", scaredAt: NOW });
    const { to } = decision.movement as { to: { x: number; y: number } };
    expect(to.x).toBeLessThan(-150);
    expect(Math.abs(to.y)).toBeLessThan(1);
  });

  it("veers round a wall to a clear spot instead of flying into it", () => {
    /* Everything to the left (straight away from the player) is wall */
    const input = { ...bird(player(30)), canTravel: (to: { x: number }) => to.x > -5 };
    const decision = decideNpcAction(input, () => 0.5);
    const { to } = decision.movement as { to: { x: number; y: number } };
    expect(to.x).toBeGreaterThan(-5);
    expect(Math.abs(to.y)).toBeGreaterThan(50);
  });

  it("keeps flying to its spot once the player is out of range", () => {
    const escapeTo = { x: -200, y: 0 };
    const decision = decideNpcAction(bird(null, { scaredAt: NOW - 500, escapeTo }), never);
    expect(decision.movement).toMatchObject({ type: "escape", to: escapeTo });
    expect(decision.habitat).toBe("air");
  });

  it("picks a new spot when the player follows it there", () => {
    const escapeTo = { x: -40, y: 0 };
    const decision = decideNpcAction(bird(player(-30), { escapeTo }), () => 0.5);
    const { to } = decision.movement as { to: { x: number; y: number } };
    expect(to.x).toBeGreaterThan(150);
  });

  it("lands as soon as it reaches its spot", () => {
    const decision = decideNpcAction(
      bird(null, { scaredAt: NOW - 1000, escapeTo: { x: 5, y: 0 } }),
      never,
    );
    expect(decision.habitat).toBeUndefined();
    expect(decision.behavior).toBe("wander");
  });

  it("lands short of a spot it can't reach once its calm time is up", () => {
    const decision = decideNpcAction(
      bird(null, { scaredAt: NOW - 60_000, escapeTo: { x: -200, y: 0 } }),
      never,
    );
    expect(decision.habitat).toBeUndefined();
  });

  it("gets away at its own speed, staying in its habitat when it has no other", () => {
    const input = bird(player(30));
    input.npc.behaviors = { fight: false, wander: {}, skittish: { speed: 1.3 } };
    const decision = decideNpcAction(input, () => 0.5);
    expect(decision.movement).toMatchObject({ type: "escape", speedRatio: 1.3 });
    expect(decision.habitat).toBeUndefined();
  });

  it("stops on landing and keeps its facing for a moment before wandering on", () => {
    const decision = decideNpcAction(
      bird(null, { habitat: "air", scaredAt: NOW - 1000, escapeTo: { x: 5, y: 0 } }),
      () => 0.1,
    );
    expect(decision.habitat).toBeUndefined();
    expect(decision.movement).toEqual({ type: "wander", vx: 0, vy: 0, nextWanderAt: 5 + 900 });
  });
});
