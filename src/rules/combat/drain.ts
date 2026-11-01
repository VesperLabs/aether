import type { StatBag } from "@/rules/stats";

/** A resource an attack can drain from its victim into the attacker. */
export type DrainResource = "hp" | "mp" | "sp";

/** The stat that drains each resource, as a percentage of physical damage, and how it rounds. */
const DRAIN_STATS: Record<DrainResource, { stat: string; round: (n: number) => number }> = {
  hp: { stat: "hpSteal", round: Math.round },
  mp: { stat: "mpSteal", round: Math.floor },
  sp: { stat: "spSteal", round: Math.floor },
};

export interface Drain {
  resource: DrainResource;
  amount: number;
}

/** What one attack drains: each resource with a steal stat gets its share of physical damage, at least 1. */
export function calculateDrains(
  physicalDamage: number,
  stats: StatBag | null | undefined,
): Drain[] {
  const drains: Drain[] = [];
  for (const [resource, { stat, round }] of Object.entries(DRAIN_STATS)) {
    const percent = Number(stats?.[stat]);
    if (!(percent > 0)) continue;
    const amount = Math.max(round((physicalDamage * percent) / 100), 1);
    drains.push({ resource: resource as DrainResource, amount });
  }
  return drains;
}

export interface DrainHitLike {
  type: string;
  amount?: number;
  isDrain?: boolean;
  from: string;
  to: string;
}

/**
 * Folds one attack's drain hits into one per drainer and resource, summing the amounts, so a
 * swing through a crowd shows one total. The merged hit keeps the first victim as its `from`.
 */
export function mergeDrainHits<T extends DrainHitLike>(hits: T[]): T[] {
  const merged: T[] = [];
  const byKey = new Map<string, T>();
  for (const hit of hits) {
    if (!hit.isDrain) {
      merged.push(hit);
      continue;
    }
    const key = `${hit.to}:${hit.type}`;
    const total = byKey.get(key);
    if (total) {
      total.amount = (total.amount ?? 0) + (hit.amount ?? 0);
      continue;
    }
    const copy = { ...hit };
    byKey.set(key, copy);
    merged.push(copy);
  }
  return merged;
}
