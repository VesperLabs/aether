import { idle, follow, reset, talk, unstuck } from "./built-in";
import { chase, kite, retreat } from "./fight";
import { guard } from "./guard";
import type { NpcBehavior } from "./types";
import { leash, wander } from "./wander";

/** Every behavior, in tie-break order. Each scores 0 when the NPC lacks it or it doesn't apply. */
export const NPC_BEHAVIORS = {
  reset,
  chase,
  unstuck,
  guard,
  talk,
  leash,
  wander,
  retreat,
  kite,
  follow,
  idle,
} satisfies Record<string, NpcBehavior>;

export type NpcBehaviorId = keyof typeof NPC_BEHAVIORS;

export const NPC_BEHAVIOR_IDS = Object.keys(NPC_BEHAVIORS) as NpcBehaviorId[];
