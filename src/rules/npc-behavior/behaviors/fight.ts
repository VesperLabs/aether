import type { Rng } from "@/rules/world";
import { behaviorOptions, keepsAway } from "../behavior-options";
import {
  NPC_KITE_MIN_RANGE,
  NPC_KITE_SPEED_RATIO,
  NPC_RETREAT_MS,
  NPC_RETREAT_SPEED_RATIO,
  NPC_STRAFE_SWITCH_MS,
} from "../constants";
import type { NpcMovement } from "../decide";
import { checkInRange, distanceBetween } from "../range";
import { getIdealDistance } from "../reach";
import type { BehaviorContext, NpcBehavior } from "./types";

/*
 * The `fight` behavior's moves. How it closes in comes from what it carries: melee closes to
 * reach, ranged weapons and spells close to a clear shot and sidestep, charges lunge (in
 * `decide.ts`). Its options only tune that.
 */

/**
 * Close in on the target, stopping once it is in attack range or while winding up. Ranged NPCs
 * keep closing (pathing around walls) until they have a clear shot, then sidestep between shots.
 */
export const chase: NpcBehavior = {
  engaged: true,
  score: (ctx) => (ctx.canChase ? 1 : 0),
  move: ({ input, target, standBand, hasClearShot, inMeleeReach, isAttacking }, rng) => {
    if (input.state.isAiming || isAttacking || inMeleeReach) return { type: "standStill" };
    if (!standBand) return { type: "chase", pathed: input.isNearCollideTile };
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

/**
 * Badly hurt (below `fleeBelow`): run from the target without turning to fight, slower than walking. Only once per
 * fight and only for `NPC_RETREAT_MS`, then it fights to the end.
 */
export const retreat: NpcBehavior = {
  engaged: true,
  holdsFire: true,
  score: ({ input, canChase }) => {
    const { hp, maxHp } = input.npc.stats ?? {};
    if (!canChase || !maxHp) return 0;
    const { retreatAt } = input.state;
    if (retreatAt !== undefined && input.now - retreatAt >= NPC_RETREAT_MS) return 0;
    const fight = behaviorOptions(input.npc, "fight");
    if (!fight || fight.fleeBelow === undefined) return 0;
    return (hp as number) / maxHp < fight.fleeBelow ? 1.1 : 0;
  },
  move: ({ input }) => ({
    type: "flee",
    speedRatio: NPC_RETREAT_SPEED_RATIO,
    ...(input.state.retreatAt === undefined && { retreatAt: input.now }),
  }),
};

/**
 * Ranged NPCs and casters back away (slower than they walk) when the target closes in, then shoot
 * again. They plant their feet while winding up, so a chaser gets a moment to catch them.
 */
export const kite: NpcBehavior = {
  engaged: true,
  score: ({ input, target, canChase, standBand }) =>
    keepsAway(input.npc) &&
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
