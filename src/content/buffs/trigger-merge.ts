/** A trigger as gear carries it: a buff or debuff that fires on 1 in `chance` events. */
interface TriggerLike {
  event?: string;
  type?: string;
  name?: string;
  level?: number;
  chance?: number;
}

/** Copies of one trigger as one: their chances added up, at the highest level among them. */
interface MergedTrigger {
  event: string;
  type: string;
  name: string;
  level: number;
  /** The chance it fires, 0 to 100. */
  percent: number;
}

/**
 * Every copy of the same trigger (event, kind and buff) merged into one, so stacking a mod adds
 * to its chance and never rolls it twice. Two 5% Venomous make one 10% roll. Game and tooltips
 * both read triggers through this, so what the tooltip says is what rolls.
 */
export function mergeTriggers(triggers: readonly (TriggerLike | null | undefined)[] = []) {
  const merged = new Map<string, MergedTrigger>();
  for (const trigger of triggers) {
    if (!trigger?.event || !trigger.name || !trigger.chance) continue;
    const key = `${trigger.event}:${trigger.type}:${trigger.name}`;
    const seen = merged.get(key);
    const percent = 100 / trigger.chance;
    const level = Number(trigger.level ?? 1);
    if (seen) {
      seen.percent = Math.min(100, seen.percent + percent);
      seen.level = Math.max(seen.level, level);
    } else {
      merged.set(key, {
        event: trigger.event,
        type: String(trigger.type),
        name: trigger.name,
        level,
        percent: Math.min(100, percent),
      });
    }
  }
  return [...merged.values()];
}
