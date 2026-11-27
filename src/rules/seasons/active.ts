import type { ActiveTimes, Season } from "@/content";

/** Whether `hour` (0 to 24) falls in `[from, to)`; a window past midnight (`[20, 6]`) wraps. */
function inHours([from, to]: readonly [number, number], hour: number): boolean {
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

/** When and in what weather an actor might be out: its map's season, the hour, and if anything falls there. */
export interface ActiveMoment {
  season: Season;
  hour: number;
  /** Rain or snow is falling on its map (showers or a storm). */
  isFalling?: boolean;
}

/**
 * Whether an actor is out in the world at `moment`. Unset times never keep it away; outside them
 * it's away: hidden, out of reach, back when its time comes round again.
 */
export function isActive(
  active: ActiveTimes | undefined,
  { season, hour, isFalling }: ActiveMoment,
) {
  if (!active) return true;
  if (active.seasons && !active.seasons.includes(season)) return false;
  if (active.fairWeather && isFalling) return false;
  return !active.hours || inHours(active.hours, hour);
}
