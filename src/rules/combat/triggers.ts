import { randomInt, type Rng } from "@/rules/loot";

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
 * Rolls every trigger of `event` in order (each rolls 1..chance and fires on a 1).
 * The hitter's `onAttackHit` buffs land on itself and its debuffs on the victim;
 * the victim's `onHurt` buffs land on the victim itself ("self" is whoever owns the trigger).
 */
export function rollTriggers(
  triggers: Array<TriggerLike | null | undefined> | undefined,
  event: TriggerEvent,
  rng: Rng,
): FiredTrigger[] {
  const fired: FiredTrigger[] = [];
  const matching = triggers?.filter((t) => t?.event === event);
  if (!matching?.length) return fired;
  for (const trigger of matching) {
    const { name, level, type, chance } = (trigger ?? {}) as TriggerLike;
    const roll = randomInt(rng, 1, chance as number);
    if (roll !== 1) continue;
    if (type === "buff")
      fired.push({ name: name as string, level: level as number, target: "self" });
    if (type === "debuff" && event === "onAttackHit") {
      fired.push({ name: name as string, level: level as number, target: "other" });
    }
  }
  return fired;
}
