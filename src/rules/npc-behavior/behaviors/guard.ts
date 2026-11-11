import { behaviorOptions } from "../behavior-options";
import { checkInRange } from "../range";
import type { NpcBehavior } from "./types";

/** Holds its `guard` spot, facing down, walking back when pushed off it. */
export const guard: NpcBehavior = {
  score: ({ input }) => (behaviorOptions(input.npc, "guard") ? 0.8 : 0),
  move: ({ input }) => {
    const guard = behaviorOptions(input.npc, "guard");
    const at = guard ? guard.at : undefined;
    if (checkInRange(input.npc, at ?? input.npc.startingCoords, 1)) {
      return { type: "waitAtSpawn", faceDownAfterMs: input.delta * 4 };
    }
    return at ? { type: "walkTo", to: at, pathed: true } : { type: "returnToSpawn", pathed: true };
  },
};
