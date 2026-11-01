import type { MobBehavior } from "@/content";
import type { Rng } from "@/rules/world";
import {
  NPC_FOLLOW_DISTANCE,
  NPC_HOME_RANGE,
  NPC_KITE_MIN_RANGE,
  NPC_RETREAT_HP_RATIO,
} from "./constants";
import type { NpcPlayerView } from "./aggro";
import type { NpcBehaviorInput, NpcMovement } from "./decide";
import { checkInRange, distanceBetween } from "./range";
import { decideWander } from "./wander";

/** What a behavior sees when it is scored and run. */
export interface BehaviorContext {
  input: NpcBehaviorInput;
  /** The player the NPC is locked on to, if any. */
  target: NpcPlayerView | null;
  /** The target is alive and still within aggro range. */
  canChase: boolean;
  attackRange: number;
  /** The NPC is attacking this tick (it stays put while it does). */
  isAttacking: boolean | undefined;
  /** Leashed: walking home to heal, ignoring players. */
  isResetting: boolean;
}

/**
 * One thing an NPC can be doing. Each tick the brain scores every behavior the NPC has and runs the
 * highest; 0 means "not now". Behaviors are pure and only describe a movement.
 */
export interface NpcBehavior {
  score(ctx: BehaviorContext): number;
  move(ctx: BehaviorContext, rng: Rng): NpcMovement;
  /** Fighting a target. Choosing anything else drops the target. */
  engaged?: boolean;
}

/** Close in on the target, stopping once it is in attack range or while winding up. */
const chase: NpcBehavior = {
  engaged: true,
  score: (ctx) => (ctx.canChase ? 1 : 0),
  move: ({ input, target, attackRange, isAttacking }) => {
    const inReach = checkInRange(input.npc, target, attackRange);
    if (inReach || input.state.isAiming || isAttacking) return { type: "standStill" };
    return { type: "chase", pathed: input.isNearCollideTile };
  },
};

/** Pulled too far from spawn: walk home, ignoring everyone, and heal on arrival. */
const reset: NpcBehavior = {
  score: ({ isResetting }) => (isResetting ? 1.2 : 0),
  move: ({ input }) =>
    checkInRange(input.npc, input.npc.startingCoords, NPC_HOME_RANGE)
      ? { type: "standStill" }
      : { type: "returnToSpawn", pathed: true },
};

/** Badly hurt: run from the target (still swinging if it catches up). */
const retreat: NpcBehavior = {
  engaged: true,
  score: ({ input, canChase }) => {
    const { hp, maxHp } = input.npc.stats ?? {};
    if (!canChase || !maxHp) return 0;
    return (hp as number) / maxHp < NPC_RETREAT_HP_RATIO ? 1.1 : 0;
  },
  move: () => ({ type: "flee" }),
};

/** Ranged NPCs back away when the target closes in, then shoot again. */
const kite: NpcBehavior = {
  engaged: true,
  score: ({ input, target, canChase, attackRange }) =>
    canChase &&
    attackRange > NPC_KITE_MIN_RANGE * 2 &&
    checkInRange(input.npc, target, NPC_KITE_MIN_RANGE)
      ? 1.05
      : 0,
  move: () => ({ type: "flee" }),
};

/** Stay close to a leader, waiting at heel when near. */
const follow: NpcBehavior = {
  score: ({ input }) => (input.leader ? 0.65 : 0),
  move: ({ input }) =>
    distanceBetween(input.npc, input.leader) > NPC_FOLLOW_DISTANCE
      ? { type: "follow", pathed: input.isNearCollideTile }
      : { type: "standStill" },
};

/** Stuck in a wall or off the map: head home. */
const unstuck: NpcBehavior = {
  score: ({ input }) => (input.isOutOfBounds ? 0.95 : 0),
  /* TODO: Improve this so that it moves toward the nearest open tile instead */
  move: () => ({ type: "returnToSpawn", pathed: true }),
};

/** Static NPCs hold their post. */
const guard: NpcBehavior = {
  score: ({ input }) => (input.state.isStatic ? 0.8 : 0),
  move: ({ input }) =>
    checkInRange(input.npc, input.npc.startingCoords, 1)
      ? { type: "waitAtSpawn", faceDownAfterMs: input.delta * 4 }
      : { type: "returnToSpawn", pathed: true },
};

/** Stand still while someone is talking to it. */
const talk: NpcBehavior = {
  score: ({ input }) => (input.npc.hasTalkers ? 0.7 : 0),
  move: () => ({ type: "talk" }),
};

/** Wandered too far from spawn: walk back. */
const leash: NpcBehavior = {
  score: ({ input }) =>
    input.state.walkRange &&
    distanceBetween(input.npc, input.npc.startingCoords) >= input.state.walkRange
      ? 0.6
      : 0,
  move: () => ({ type: "returnToSpawn", pathed: false }),
};

/** Amble about. The fallback when nothing else applies. */
const wander: NpcBehavior = {
  score: () => 0.1,
  move: ({ input }, rng) => ({
    type: "wander",
    ...decideWander(
      {
        time: input.time,
        nextWanderAt: input.state.nextWanderAt,
        walkSpeed: input.npc.stats?.walkSpeed as number,
      },
      rng,
    ),
  }),
};

export const NPC_BEHAVIORS: Record<MobBehavior, NpcBehavior> = {
  chase,
  unstuck,
  guard,
  talk,
  leash,
  wander,
  reset,
  retreat,
  kite,
  follow,
};

export type NpcBehaviorId = MobBehavior;

/** What every NPC does unless its content says otherwise. */
export const DEFAULT_NPC_BEHAVIORS: readonly NpcBehaviorId[] = [
  "reset",
  "chase",
  "unstuck",
  "guard",
  "talk",
  "leash",
  "wander",
];
