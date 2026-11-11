import {
  DEFAULT_BEHAVIORS,
  type ActorBehaviors,
  type BehaviorId,
  type BehaviorOptions,
} from "@/content";
import type { NpcWeaponRanges } from "./range";

/** What reading an NPC's behaviors needs: its own, and what it carries. */
interface WithBehaviors {
  behaviors?: ActorBehaviors;
  weapons?: NpcWeaponRanges;
}

/** Its options for `id`, from its own behaviors over the defaults, or false when it lacks it. */
export function behaviorOptions<K extends BehaviorId>(
  npc: WithBehaviors,
  id: K,
): BehaviorOptions[K] | false {
  return npc.behaviors?.[id] ?? DEFAULT_BEHAVIORS[id] ?? false;
}

/** Goes after foes on sight, rather than only fighting back. */
export function isNpcAggressive(npc: WithBehaviors) {
  const fight = behaviorOptions(npc, "fight");
  return !!fight && fight.starts === "onSight";
}

/** Never fights, not even when hit. */
export const isNpcPassive = (npc: WithBehaviors) => !behaviorOptions(npc, "fight");

/** Backs off from foes that close in: set by `keepAway`, else on when it holds a ranged weapon. */
export function keepsAway(npc: WithBehaviors) {
  const fight = behaviorOptions(npc, "fight");
  if (!fight) return false;
  return fight.keepAway ?? !!(npc.weapons?.handLeft || npc.weapons?.handRight);
}

/** How far it may wander from home before walking back, or undefined for no limit. */
export function wanderRadius(npc: WithBehaviors) {
  const wander = behaviorOptions(npc, "wander");
  return wander ? wander.radius : undefined;
}

/** Fires across walls and water instead of moving for a clear shot. */
export function shootsOverWalls(npc: WithBehaviors) {
  const fight = behaviorOptions(npc, "fight");
  return !!fight && !!fight.shootsOverWalls;
}

/** `overrides` (a map spawn's) merged over `base` (the actor's), one behavior at a time. */
export function mergeBehaviors(base: ActorBehaviors = {}, overrides: ActorBehaviors = {}) {
  const merged: Record<string, unknown> = { ...base };
  for (const [id, options] of Object.entries(overrides)) {
    const current = merged[id] ?? DEFAULT_BEHAVIORS[id as BehaviorId];
    merged[id] = options && current ? { ...current, ...options } : options;
  }
  return merged as ActorBehaviors;
}
