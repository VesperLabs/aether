import { NPC_FOLLOW_DISTANCE, NPC_FOLLOW_PATH_DISTANCE, NPC_HOME_RANGE } from "../constants";
import { getCharacterDirection } from "@/rules/world";
import { checkInRange, distanceBetween } from "../range";
import type { NpcBehavior } from "./types";

/* What every NPC does whatever its `behaviors`: driven by its parts and state, never listed. */

/** Pulled too far from spawn: walk home, ignoring everyone, and heal on arrival. */
export const reset: NpcBehavior = {
  score: ({ isResetting }) => (isResetting ? 1.2 : 0),
  move: ({ input }) =>
    checkInRange(input.npc, input.npc.home ?? input.npc.startingCoords, NPC_HOME_RANGE)
      ? { type: "standStill" }
      : { type: "returnToSpawn", pathed: true },
};

/** Stay close to a leader, waiting at heel when near. */
export const follow: NpcBehavior = {
  score: ({ input }) => (input.leader ? 0.65 : 0),
  move: ({ input }) => {
    const distance = distanceBetween(input.npc, input.leader);
    if (distance <= NPC_FOLLOW_DISTANCE) return { type: "standStill" };
    return { type: "follow", pathed: distance > NPC_FOLLOW_PATH_DISTANCE };
  },
};

/** Stuck in a wall or off the map: head home. */
export const unstuck: NpcBehavior = {
  score: ({ input }) => (input.isOutOfBounds ? 0.95 : 0),
  /* TODO: Improve this so that it moves toward the nearest open tile instead */
  move: () => ({ type: "returnToSpawn", pathed: true }),
};

/** Stand still while someone is talking to it, turned to face them. */
export const talk: NpcBehavior = {
  score: ({ input }) => (input.npc.talker ? 0.7 : 0),
  move: ({ input }) => ({
    type: "talk",
    face: getCharacterDirection(input.npc, input.npc.talker ?? input.npc),
  }),
};

/** Stand still: the last resort when nothing else applies (no `wander`). */
export const idle: NpcBehavior = {
  score: () => 0.01,
  move: () => ({ type: "standStill" }),
};
