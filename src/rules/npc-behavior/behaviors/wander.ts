import { behaviorOptions, wanderRadius } from "../behavior-options";
import { distanceBetween } from "../range";
import { decideWander } from "../wander";
import type { NpcBehavior } from "./types";

/** Wandered past its `wander` radius: walk back. */
export const leash: NpcBehavior = {
  score: ({ input }) => {
    const radius = wanderRadius(input.npc);
    const home = input.npc.home ?? input.npc.startingCoords;
    return radius && distanceBetween(input.npc, home) >= radius ? 0.6 : 0;
  },
  move: () => ({ type: "returnToSpawn", pathed: false }),
};

/** Amble about when nothing else applies. */
export const wander: NpcBehavior = {
  score: ({ input }) => (behaviorOptions(input.npc, "wander") ? 0.1 : 0),
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
