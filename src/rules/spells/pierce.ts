import type { SpellDefinition } from "@/content";

/*
 * Piercing: whether a hit goes on through everyone it touches, or stops at the first one it may.
 * The spell decides for now (`pierces`); what carries the hit (a weapon, an arrow) can join in here
 * later, so the server and the client go on asking this one place.
 */

/** Whether a hit from `spell` goes on through everyone it touches. */
export const piercesThrough = (spell: Pick<SpellDefinition, "pierces">) => spell.pierces !== false;

/**
 * Of the ids a hit overlapped this tick (in order), the ones it lands on, and whether it stops
 * there. A piercing hit lands on all of them; one that doesn't lands on the first it `mayTouch` and
 * stops, passing any before it it may not (allies, for a hit on foes).
 */
export function takeHits(
  overlapped: readonly string[],
  { pierces, mayTouch }: { pierces: boolean; mayTouch: (id: string) => boolean },
): { hits: string[]; stops: boolean } {
  if (pierces) return { hits: [...overlapped], stops: false };
  const first = overlapped.find(mayTouch);
  return first === undefined ? { hits: [], stops: false } : { hits: [first], stops: true };
}
