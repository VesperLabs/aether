import { mergeTriggers } from "@/content";
import type { Rng } from "@/rules/loot";

export type TriggerEvent = "onAttackHit" | "onHurt";

/** An item or buff effect that fires on 1 in `chance` hits. */
export interface TriggerLike {
  event?: string;
  type?: string;
  name?: string;
  level?: number;
  chance?: number;
}

export interface FiredTrigger {
  name: string;
  level: number;
  /** Who gets the buff: the one who fired the trigger or the other one in the fight. */
  target: "self" | "other";
}

/**
 * Rolls every trigger of `event` once, copies of the same one merged first: two 5% Venomous
 * roll once at 10%. The hitter's `onAttackHit` buffs land on itself and its debuffs on the
 * victim; the victim's `onHurt` buffs land on the victim itself ("self" is whoever owns it).
 */
export function rollTriggers(
  triggers: Array<TriggerLike | null | undefined> | undefined,
  event: TriggerEvent,
  rng: Rng,
): FiredTrigger[] {
  const fired: FiredTrigger[] = [];
  const matching = mergeTriggers(triggers).filter((trigger) => trigger.event === event);
  for (const { name, level, type, percent } of matching) {
    if (rng() * 100 >= percent) continue;
    if (type === "buff") fired.push({ name, level, target: "self" });
    if (type === "debuff" && event === "onAttackHit") fired.push({ name, level, target: "other" });
  }
  return fired;
}
