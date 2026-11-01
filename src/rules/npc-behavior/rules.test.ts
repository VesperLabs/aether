import { describe, expect, it } from "vitest";
import {
  calculateNpcAggroRange,
  canTalkToNpc,
  NPC_TALK_LATENCY_TOLERANCE,
  NPC_TALK_RANGE,
  checkInRange,
  decideAggro,
  decideNpcAction,
  decideTalkingEnded,
  decideWander,
  findSuitableAbility,
  getShouldAttackRange,
  isNpcAttackReady,
  isStillAggro,
  shouldRespawn,
  type NpcBehaviorInput,
  type NpcPlayerView,
} from ".";

const NOW = 1_000_000;
const never = () => 0.99;
const always = () => 0;

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
      behaviors: ["aggressive"],
      ...over.npc,
    },
    state: {
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

describe("range", () => {
  it("measures edge to edge, with an 8 pixel default body", () => {
    const npc = { x: 0, y: 0 };
    expect(checkInRange(npc, { x: 26, y: 0 }, 10)).toBe(true);
    expect(checkInRange(npc, { x: 27, y: 0 }, 10)).toBe(false);
    expect(checkInRange({ ...npc, bodySize: 20 }, { x: 40, y: 0, bodySize: 10 }, 10)).toBe(true);
    expect(checkInRange(npc, null, 10)).toBeUndefined();
  });

  it("attacks from a ranged weapon's range, else at melee range", () => {
    expect(getShouldAttackRange({})).toBe(8);
    expect(getShouldAttackRange({ handRight: { range: 90 } })).toBe(90);
    expect(getShouldAttackRange({ handLeft: { range: 40 }, handRight: { range: 90 } })).toBe(40);
  });
});

describe("aggro", () => {
  const npc = { x: 0, y: 0, baseLevel: 5, stats: { level: 5 } };

  it("notices players within 10 + 8 per level, up to the kite range", () => {
    expect(calculateNpcAggroRange(5)).toBe(50);
    expect(calculateNpcAggroRange(100)).toBe(220);
    // 50 range plus the two 8 pixel bodies
    expect(decideAggro({ npc, nearestPlayer: player({ x: 66 }) }).isAggro).toBe(true);
    expect(decideAggro({ npc, nearestPlayer: player({ x: 67 }) }).isAggro).toBe(false);
  });

  it("chases a locked player up to the kite range", () => {
    const locked = player({ x: 230 });
    const result = decideAggro({ npc, lockedPlayerId: "p1", lockedPlayer: locked });
    expect(result).toEqual({ isAggro: true, targetId: "p1" });
    expect(
      decideAggro({ npc, lockedPlayerId: "p1", lockedPlayer: player({ x: 300 }) }).isAggro,
    ).toBe(false);
  });

  it("falls back to the nearest player when the locked one left", () => {
    const result = decideAggro({
      npc,
      lockedPlayerId: "gone",
      lockedPlayer: null,
      nearestPlayer: player({ socketId: "p2", x: 100 }),
    });
    expect(result).toEqual({ isAggro: true, targetId: "p2" });
    expect(decideAggro({ npc })).toEqual({ isAggro: false });
  });

  it("sees stealthed players from less far", () => {
    const visible = player({ x: 40 });
    expect(decideAggro({ npc, nearestPlayer: visible }).isAggro).toBe(true);
    const hidden = player({ x: 40, stealthBuff: { level: 5 }, stats: { level: 30 } });
    expect(decideAggro({ npc, nearestPlayer: hidden }).isAggro).toBe(false);
  });

  it("is ready to attack 400ms after the attack delay", () => {
    const base = { attackDelay: 300, now: NOW };
    expect(isNpcAttackReady({ ...base, lastAttack: NOW - 701 })).toBe(true);
    expect(isNpcAttackReady({ ...base, lastAttack: NOW - 700 })).toBe(false);
  });

  it("is still aggro when locked on and out of combat for 5 seconds", () => {
    expect(isStillAggro("p1", NOW - 5001, NOW)).toBe(true);
    expect(isStillAggro("p1", NOW - 5000, NOW)).toBe(false);
    expect(isStillAggro(null, NOW - 9000, NOW)).toBeFalsy();
  });

  it("respawns once the respawn time has passed", () => {
    expect(shouldRespawn({ deadTime: NOW - 10_000, respawnTime: 10_000, now: NOW })).toBe(true);
    expect(shouldRespawn({ deadTime: NOW - 9_999, respawnTime: 10_000, now: NOW })).toBe(false);
  });
});

describe("abilities", () => {
  const base = {
    self: { x: 0, y: 0 },
    abilities: { 1: { base: "fireball" }, 2: { base: "haste" } },
    buffs: [],
    lastCast: { global: NOW - 10_000 },
    castDelay: 300,
    now: NOW,
  };

  it("casts an attack spell when the target is inside its range band", () => {
    const near = { x: 80, y: 0 };
    expect(findSuitableAbility({ ...base, target: near }, never).abilitySlot).toBe("1");
    // too close (min 50) and too far: a fireball only flies 120, so not from 110 away
    expect(findSuitableAbility({ ...base, target: { x: 40, y: 0 } }, never).abilitySlot).toBe(
      undefined,
    );
    expect(findSuitableAbility({ ...base, target: { x: 110, y: 0 } }, never).abilitySlot).toBe(
      undefined,
    );
  });

  it("buffs itself on a 1% roll, and only without the buff already", () => {
    const aura = { ...base, abilities: { 1: { base: "haste" } } };
    expect(findSuitableAbility(aura, never).abilitySlot).toBeUndefined();
    expect(findSuitableAbility(aura, always).abilitySlot).toBe("1");
    expect(
      findSuitableAbility({ ...aura, buffs: [{ name: "haste" }] }, always).abilitySlot,
    ).toBeUndefined();
  });

  it("skips spells that are on cooldown", () => {
    const cooling = { ...base, lastCast: { global: NOW - 10_000, fireball: NOW - 100 } };
    expect(findSuitableAbility({ ...cooling, target: { x: 100, y: 0 } }, never).ability).toBe(
      undefined,
    );
  });
});

describe("wandering", () => {
  it("keeps going until the next change is due", () => {
    expect(decideWander({ time: 100, nextWanderAt: 200, walkSpeed: 50 }, always)).toEqual({});
  });

  it("picks a direction (or stops) once due, and schedules the next change", () => {
    const at = (roll: number) =>
      decideWander({ time: 200, nextWanderAt: 200, walkSpeed: 50 }, () => roll);
    expect(at(0)).toEqual({ vx: -20, direction: "left", nextWanderAt: 325 });
    expect(at(1.5 / 7)).toMatchObject({ vx: 20, direction: "right" });
    expect(at(2.5 / 7)).toMatchObject({ vy: -20, direction: "up" });
    expect(at(3.5 / 7)).toMatchObject({ vy: 20, direction: "down" });
    expect(at(0.9)).toMatchObject({ vx: 0, vy: 0 });
  });

  it("does not depend on the frame rate", () => {
    let nextWanderAt: number | undefined;
    let changes = 0;
    for (let time = 0; time < 10_000; time += 16) {
      const step = decideWander({ time, nextWanderAt, walkSpeed: 50 }, () => 0.5);
      if (step.nextWanderAt !== undefined) {
        nextWanderAt = step.nextWanderAt;
        changes++;
      }
    }
    expect(changes).toBe(40);
  });

  it("ends conversations with every player who walked off", () => {
    const players: Record<string, { x: number; y: number }> = {
      a: { x: 500, y: 0 },
      b: { x: 500, y: 0 },
      c: { x: 10, y: 0 },
    };
    const ended = decideTalkingEnded({ x: 0, y: 0 }, ["a", "b", "c"], (id) => players[id]);
    expect(ended).toEqual(["a", "b"]);
    expect(decideTalkingEnded({ x: 0, y: 0 }, ["gone"], () => undefined)).toEqual(["gone"]);
  });
});

describe("deciding what an npc does", () => {
  it("wanders when nobody is around", () => {
    const decision = decideNpcAction(input({ npc: { behaviors: [] } }), always);
    expect(decision.movement).toMatchObject({ type: "wander" });
    expect(decision.action).toEqual({ type: "idle" });
    expect(decision.bubbleMessage).toBeNull();
  });

  it("aggroes on a nearby player, chases and breaks their stealth", () => {
    const nearest = player({ x: 40 });
    const decision = decideNpcAction(input({ rest: { nearestPlayer: nearest } }), never);
    expect(decision.lockedPlayerId).toBe("p1");
    expect(decision.resetAttackTimer).toBe(true);
    expect(decision.npcAttackReady).toBe(false);
    expect(decision.movement).toEqual({ type: "chase", pathed: false });
    expect(decision.expireStealthOfPlayerId).toBe("p1");
    expect(decision.bubbleMessage).toBe("?");
  });

  it("paths when next to a collision tile", () => {
    const decision = decideNpcAction(
      input({ rest: { nearestPlayer: player({ x: 40 }), isNearCollideTile: true } }),
      never,
    );
    expect(decision.movement).toEqual({ type: "chase", pathed: true });
  });

  it("attacks once in range, the attack delay has passed and it is not already attacking", () => {
    const close = player({ x: 20 });
    const decision = decideNpcAction(
      input({
        state: { lockedPlayerId: "p1", npcAttackReady: true, lastAttack: NOW - 100 },
        rest: { lockedPlayer: close, nearestPlayer: close },
      }),
      never,
    );
    expect(decision.movement).toEqual({ type: "standStill" });
    expect(decision.action).toEqual({
      type: "attack",
      direction: "right",
      castAngle: 0,
      windupMs: 500,
    });
  });

  it("warns for the mob's own windup instead of the default", () => {
    const close = player({ x: 20 });
    const decision = decideNpcAction(
      input({
        npc: { windupMs: 500 },
        state: { lockedPlayerId: "p1", npcAttackReady: true, lastAttack: NOW - 100 },
        rest: { lockedPlayer: close, nearestPlayer: close },
      }),
      never,
    );
    expect(decision.action).toMatchObject({ type: "attack", windupMs: 800 });
  });

  it("does not attack while aiming or already attacking", () => {
    const close = player({ x: 20 });
    const rest = { lockedPlayer: close, nearestPlayer: close };
    const ready = { lockedPlayerId: "p1", npcAttackReady: true, lastAttack: NOW - 100 };
    expect(
      decideNpcAction(input({ state: { ...ready, isAiming: true }, rest }), never).action.type,
    ).toBe("idle");
    expect(
      decideNpcAction(input({ state: { ...ready, isAttacking: true }, rest }), never).action.type,
    ).toBe("idle");
  });

  it("casts an attack spell at a target in its band instead of walking in", () => {
    const target = player({ x: 100 });
    const decision = decideNpcAction(
      input({
        npc: { abilities: { 1: { base: "fireball" } } },
        state: { lockedPlayerId: "p1", lastAttack: NOW - 100 },
        rest: { lockedPlayer: target, nearestPlayer: target },
      }),
      never,
    );
    expect(decision.action).toEqual({
      type: "cast",
      abilitySlot: "1",
      ability: { base: "fireball" },
      windupMs: 500,
    });
  });

  it("stands still while stunned", () => {
    const decision = decideNpcAction(
      input({ rest: { isStunned: true, nearestPlayer: player({ x: 40 }) } }),
      never,
    );
    expect(decision.movement).toEqual({ type: "standStill" });
    expect(decision.action).toEqual({ type: "idle" });
  });

  it("lets go of a dead target", () => {
    const dead = player({ isDead: true, x: 40 });
    const decision = decideNpcAction(
      input({ state: { lockedPlayerId: "p1" }, rest: { lockedPlayer: dead, nearestPlayer: dead } }),
      never,
    );
    expect(decision.lockedPlayerId).toBeNull();
    expect(decision.expireStealthOfPlayerId).toBeUndefined();
  });

  it("returns to spawn when out of bounds, static or beyond its walk range", () => {
    const idle = {};
    const passive = { behaviors: [] };
    expect(
      decideNpcAction(input({ npc: passive, rest: { isOutOfBounds: true } }), never).movement,
    ).toEqual({ type: "returnToSpawn", pathed: true });
    const away = { x: 100, y: 0 };
    expect(
      decideNpcAction(
        input({ npc: { ...away, ...passive }, state: { ...idle, isStatic: true } }),
        never,
      ).movement,
    ).toEqual({ type: "returnToSpawn", pathed: true });
    expect(
      decideNpcAction(
        input({ npc: { x: 0, y: 0, ...passive }, state: { ...idle, isStatic: true } }),
        never,
      ).movement,
    ).toEqual({ type: "waitAtSpawn", faceDownAfterMs: 200 });
    expect(
      decideNpcAction(
        input({ npc: { ...away, ...passive }, state: { ...idle, walkRange: 50 } }),
        never,
      ).movement,
    ).toEqual({ type: "returnToSpawn", pathed: false });
  });

  it("stops to talk when players are talking to it", () => {
    const decision = decideNpcAction(input({ npc: { hasTalkers: true, behaviors: [] } }), never);
    expect(decision.movement).toEqual({ type: "talk" });
  });
});

describe("canTalkToNpc", () => {
  const npc = { x: 100, y: 100, roomName: "a" };
  it("allows a player within range in the same room", () => {
    expect(canTalkToNpc({ x: 100, y: 100, roomName: "a" }, npc)).toBe(true);
    expect(canTalkToNpc({ x: 100 + NPC_TALK_RANGE, y: 100, roomName: "a" }, npc)).toBe(true);
  });
  it("allows the latency tolerance but not beyond it", () => {
    const edge = NPC_TALK_RANGE + NPC_TALK_LATENCY_TOLERANCE;
    expect(canTalkToNpc({ x: 100 + edge, y: 100, roomName: "a" }, npc)).toBe(true);
    expect(canTalkToNpc({ x: 100 + edge + 1, y: 100, roomName: "a" }, npc)).toBe(false);
  });
  it("refuses another room, missing entities and bad positions", () => {
    expect(canTalkToNpc({ x: 100, y: 100, roomName: "b" }, npc)).toBe(false);
    expect(canTalkToNpc({ x: 100, y: 100, roomName: null }, { ...npc, roomName: null })).toBe(
      false,
    );
    expect(canTalkToNpc(undefined, npc)).toBe(false);
    expect(canTalkToNpc({ x: 100, y: 100, roomName: "a" }, null)).toBe(false);
    expect(canTalkToNpc({ x: NaN, y: 100, roomName: "a" }, npc)).toBe(false);
  });
});
