import type { StatBag } from "@/shared/rules/stats";

/** `hp` -> `maxHp`. */
function maxKey(key: string) {
  return "max" + key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * The value `stats[key]` takes after changing it by `amount`, kept between 0 and its max
 * (`hp` -> `maxHp`). Returns `undefined` when there is no max for it, meaning leave it alone.
 */
export function modifyStat(
  stats: StatBag | null | undefined,
  key: string,
  amount: unknown,
): number | undefined {
  const stat = parseInt(stats?.[key]);
  const intAmount = parseInt(amount as string);

  const maxStat = stats?.[maxKey(key)];
  if (typeof stat === "undefined") return undefined;
  if (typeof maxStat === "undefined") return undefined;
  if (stat + intAmount > maxStat) return maxStat;
  if (stat + intAmount < 0) return 0;
  return stats?.[key] + intAmount;
}

/** HP at or below 0 means the hit was lethal. */
export function isLethalHp(hp: number) {
  return hp <= 0;
}
