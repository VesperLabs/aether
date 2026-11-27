import type { NpcBehaviorInput, NpcPlayerView } from ".";

/* Builders for the behavior tests: a world moment, an NPC and the players it sees. */

export const NOW = 1_000_000;
export const never = () => 0.99;

export const player = (over: Partial<NpcPlayerView> = {}): NpcPlayerView => ({
  socketId: "p1",
  x: 100,
  y: 0,
  isDead: false,
  stats: { level: 1 },
  ...over,
});

export function input(over: {
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
      talker: null,
      abilities: {},
      buffs: [],
      weapons: {},
      behaviors: { fight: { starts: "onSight" } },
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
