import type { MobMovementBehavior } from "@/content";
import type { Rng } from "@/rules/world";
import {
  NPC_FOLLOW_DISTANCE,
  NPC_HOME_RANGE,
  NPC_KITE_MIN_RANGE,
  NPC_KITE_SPEED_RATIO,
  NPC_RETREAT_HP_RATIO,
  NPC_STRAFE_SWITCH_MS,
} from "./constants";
import type { NpcPlayerView } from "./aggro";
import type { NpcBehaviorInput, NpcMovement } from "./decide";
import { checkInRange, distanceBetween } from "./range";
import { getIdealDistance, type ShotBand } from "./reach";
import { decideWander } from "./wander";

/** What a behavior sees when it is scored and run. */
export interface BehaviorContext {
  input: NpcBehaviorInput;
  /** The player the NPC is locked on to, if any. */
  target: NpcPlayerView | null;
  /** The target is alive and still within aggro range. */
  canChase: boolean;
  attackRange: number;
  /** How close it closes in before stopping: attack range, or spell range for kiters. */
  /** Where its next shot lands from, for NPCs that shoot. Unset for pure melee. */
  standBand: ShotBand | undefined;
  /** No wall between the NPC and its target. */
  hasClearShot: boolean;
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
  /** Neither attacks nor casts while chosen, so it doesn't turn on the target mid-run. */
  holdsFire?: boolean;
}

/**
 * Close in on the target, stopping once it is in attack range or while winding up. Ranged NPCs
 * keep closing (pathing around walls) until they have a clear shot, then sidestep between shots.
 */
const chase: NpcBehavior = {
  engaged: true,
  score: (ctx) => (ctx.canChase ? 1 : 0),
  move: ({ input, target, attackRange, standBand, hasClearShot, isAttacking }, rng) => {
    if (input.state.isAiming || isAttacking) return { type: "standStill" };
    if (!standBand) {
      if (checkInRange(input.npc, target, attackRange)) return { type: "standStill" };
      return { type: "chase", pathed: input.isNearCollideTile };
    }
    if (!hasClearShot) return { type: "chase", pathed: true };
    // Close in until well inside the band, then sidestep there
    const ideal = getIdealDistance(standBand);
    if (distanceBetween(input.npc, target) > (ideal + standBand.max) / 2) {
      return { type: "chase", pathed: input.isNearCollideTile };
    }
    return decideStrafe(input, ideal, rng);
  },
};

/** Keep sidestepping the same way, switching sides every second or so. */
function decideStrafe(input: BehaviorContext["input"], distance: number, rng: Rng): NpcMovement {
  const { strafeClockwise, nextStrafeAt } = input.state;
  if (nextStrafeAt !== undefined && input.time < nextStrafeAt) {
    return { type: "strafe", clockwise: !!strafeClockwise, distance };
  }
  return {
    type: "strafe",
    clockwise: rng() < 0.5,
    distance,
    nextStrafeAt: input.time + NPC_STRAFE_SWITCH_MS * (0.5 + rng()),
  };
}

/** Pulled too far from spawn: walk home, ignoring everyone, and heal on arrival. */
const reset: NpcBehavior = {
  score: ({ isResetting }) => (isResetting ? 1.2 : 0),
  move: ({ input }) =>
    checkInRange(input.npc, input.npc.home ?? input.npc.startingCoords, NPC_HOME_RANGE)
      ? { type: "standStill" }
      : { type: "returnToSpawn", pathed: true },
};

/** Badly hurt: run from the target without turning to fight. */
const retreat: NpcBehavior = {
  engaged: true,
  holdsFire: true,
  score: ({ input, canChase }) => {
    const { hp, maxHp } = input.npc.stats ?? {};
    if (!canChase || !maxHp) return 0;
    return (hp as number) / maxHp < NPC_RETREAT_HP_RATIO ? 1.1 : 0;
  },
  move: () => ({ type: "flee" }),
};

/**
 * Ranged NPCs and casters back away (slower than they walk) when the target closes in, then shoot
 * again. They plant their feet while winding up, so a chaser gets a moment to catch them.
 */
const kite: NpcBehavior = {
  engaged: true,
  score: ({ input, target, canChase, standBand }) =>
    canChase &&
    !!standBand &&
    standBand.max > NPC_KITE_MIN_RANGE * 2 &&
    checkInRange(input.npc, target, NPC_KITE_MIN_RANGE)
      ? 1.05
      : 0,
  move: ({ input, isAttacking }) =>
    input.state.isAiming || isAttacking
      ? { type: "standStill" }
      : { type: "flee", speedRatio: NPC_KITE_SPEED_RATIO },
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
    distanceBetween(input.npc, input.npc.home ?? input.npc.startingCoords) >= input.state.walkRange
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

export const NPC_BEHAVIORS: Record<MobMovementBehavior, NpcBehavior> = {
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

export type NpcBehaviorId = MobMovementBehavior;

export const isMovementBehavior = (id: string): id is NpcBehaviorId => id in NPC_BEHAVIORS;

/** What every NPC does; content adds to these. */
export const DEFAULT_NPC_BEHAVIORS: readonly NpcBehaviorId[] = [
  "reset",
  "chase",
  "unstuck",
  "guard",
  "talk",
  "leash",
  "wander",
];
