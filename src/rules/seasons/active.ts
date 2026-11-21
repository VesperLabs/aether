import type { ActiveTimes, Season } from "@/content";

/** Whether `hour` (0 to 24) falls in `[from, to)`; a window past midnight (`[20, 6]`) wraps. */
function inHours([from, to]: readonly [number, number], hour: number): boolean {
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

/**
 * Whether an actor is out in the world in `season` (its map's) at `hour`. Unset times never keep it
 * away; outside them it's away: hidden, out of reach, back when its time comes round again.
 */
export function isActive(active: ActiveTimes | undefined, season: Season, hour: number): boolean {
  if (!active) return true;
  if (active.seasons && !active.seasons.includes(season)) return false;
  return !active.hours || inHours(active.hours, hour);
}
