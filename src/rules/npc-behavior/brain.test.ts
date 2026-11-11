import { describe, expect, it } from "vitest";
import { chooseBehavior, type BehaviorContext, type NpcBehaviorInput } from ".";

function ctx(over: {
  state?: Partial<NpcBehaviorInput["state"]>;
  rest?: Partial<NpcBehaviorInput>;
  canChase?: boolean;
}): BehaviorContext {
  const input = {
    now: 0,
    time: 0,
    delta: 50,
    npc: {
      x: 0,
      y: 0,
      stats: { walkSpeed: 50 },
      startingCoords: { x: 0, y: 0 },
      hasTalkers: false,
      abilities: {},
      buffs: [],
      weapons: {},
    },
    state: { lastAttack: 0, lastCast: { global: 0 }, ...over.state },
    isStunned: false,
    isNearCollideTile: false,
    isOutOfBounds: false,
    ...over.rest,
  } as NpcBehaviorInput;
  return {
    input,
    target: null,
    canChase: !!over.canChase,
    attackRange: 8,
    standBand: undefined,
    hasClearShot: true,
    inMeleeReach: false,
    isAttacking: false,
    isResetting: false,
  };
}

describe("brain", () => {
  it("wanders when nothing else applies", () => {
    expect(chooseBehavior(ctx({}), ["chase", "guard", "wander"])).toBe("wander");
  });

  it("chasing beats everything", () => {
    const busy = ctx({ canChase: true, rest: { isOutOfBounds: true } });
    busy.input.npc.behaviors = { guard: {} };
    expect(chooseBehavior(busy, ["wander", "guard", "unstuck", "chase"])).toBe("chase");
  });

  it("only picks from the behaviors the NPC has", () => {
    expect(chooseBehavior(ctx({ canChase: true }), ["wander"])).toBe("wander");
    expect(chooseBehavior(ctx({ canChase: true }), [])).toBeUndefined();
  });

  it("guards over talking, talks over leashing", () => {
    const all = ["guard", "talk", "leash", "wander"] as const;
    const talking = (behaviors: NpcBehaviorInput["npc"]["behaviors"]) => {
      const c = ctx({});
      c.input.npc.behaviors = behaviors;
      c.input.npc.hasTalkers = true;
      c.input.npc.x = 500;
      return chooseBehavior(c, all);
    };
    expect(talking({ guard: {} })).toBe("guard");
    expect(talking({ wander: { radius: 10 } })).toBe("talk");
  });
});
