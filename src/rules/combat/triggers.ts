import { mergeTriggers } from "@/content";
import type { Rng } from "@/rules/loot";

export type TriggerEvent = "onAttackHit" | "onHurt";

/**
 * The swing a hit trigger's chance is written for, in ms. A slower swing gets a bigger chance per
 * hit and a faster one a smaller, so every weapon procs about as often per minute.
 */
export const TRIGGER_REFERENCE_SWING_MS = 400;
/** However fast or slow the swing, its chance is scaled by no more than this either way. */
const MAX_SWING_SCALE = 2;

/** An item or buff effect that fires on `percent` of events. */
interface TriggerLike {
  event?: string;
  type?: string;
  name?: string;
  level?: number;
  percent?: number;
}

interface FiredTrigger {
  name: string;
  level: number;
  /** Who gets the buff: the one who fired the trigger or the other one in the fight. */
  target: "self" | "other";
}

/** How much a swing of `swingMs` scales a hit trigger's chance. */
export function getSwingScale(swingMs: number | undefined) {
  if (!swingMs || swingMs <= 0) return 1;
  const scale = swingMs / TRIGGER_REFERENCE_SWING_MS;
  return Math.min(MAX_SWING_SCALE, Math.max(1 / MAX_SWING_SCALE, scale));
}

/**
 * Rolls every trigger of `event` once, copies of the same one merged first: two 15% Venomous
 * roll once at 30%. Hit triggers are scaled by the hitter's swing (`swingMs`). The hitter's
 * `onAttackHit` buffs land on itself and its debuffs on the victim; the victim's `onHurt` buffs
 * land on the victim itself ("self" is whoever owns it).
 */
export function rollTriggers(
  triggers: Array<TriggerLike | null | undefined> | undefined,
  event: TriggerEvent,
  rng: Rng,
  swingMs?: number,
): FiredTrigger[] {
  const fired: FiredTrigger[] = [];
  const scale = event === "onAttackHit" ? getSwingScale(swingMs) : 1;
  const matching = mergeTriggers(triggers).filter((trigger) => trigger.event === event);
  for (const { name, level, type, percent } of matching) {
    if (rng() * 100 >= Math.min(100, percent * scale)) continue;
    if (type === "buff") fired.push({ name, level, target: "self" });
    if (type === "debuff" && event === "onAttackHit") fired.push({ name, level, target: "other" });
  }
  return fired;
}
