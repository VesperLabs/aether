import { SEASONS, type MapSeasons, type Season } from "@/content";

/** One season lasts a real day, so the year comes round every four. */
export const SEASON_LENGTH_MS = 24 * 60 * 60 * 1000;

const YEAR_MS = SEASON_LENGTH_MS * SEASONS.length;

/** The world's calendar: game time plus `offsetMs` gives the time of year. */
export interface Calendar {
  offsetMs: number;
}

export const createCalendar = (): Calendar => ({ offsetMs: 0 });

/** `value` mod `by`, never negative. */
const wrap = (value: number, by: number) => ((value % by) + by) % by;

/** The season the world is in at `now`. */
export function seasonAt(now: number, calendar: Calendar): Season {
  const timeOfYear = wrap(now + calendar.offsetMs, YEAR_MS);
  return SEASONS[Math.floor(timeOfYear / SEASON_LENGTH_MS)];
}

/** Moves the calendar so `season` starts at `now`; the year carries on from there. */
export function startSeason(calendar: Calendar, now: number, season: Season): void {
  calendar.offsetMs = SEASONS.indexOf(season) * SEASON_LENGTH_MS - wrap(now, YEAR_MS);
}

/** The season a map shows while the world is in `worldSeason`. */
export function mapSeason(seasons: MapSeasons | undefined, worldSeason: Season): Season {
  if (seasons === "cycle") return worldSeason;
  return seasons ?? "summer";
}

/** The season whose name starts with `text`, so `/season w` works. */
export function findSeason(text: string): Season | undefined {
  const lower = text.toLowerCase();
  return lower ? SEASONS.find((season) => season.startsWith(lower)) : undefined;
}
