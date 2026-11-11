import { SEASONS, type MapSeasons, type Season } from "@/content";

/** Each month's season, as the northern hemisphere has them: winter is December to February. */
const SEASON_BY_MONTH: readonly Season[] = [
  "winter",
  "winter",
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "fall",
  "fall",
  "fall",
  "winter",
];

/**
 * The world's calendar. The season follows the real one, by the month in UTC, unless `/season`
 * pins one (`pinnedSeason`). Game time plus `dayOffsetMs` gives the time of day (see
 * `time-of-day`). Cheats change them; nothing else does.
 */
export interface Calendar {
  pinnedSeason?: Season;
  dayOffsetMs: number;
}

export const createCalendar = (): Calendar => ({ dayOffsetMs: 0 });

/** The season the world is in at `now`, a real date in milliseconds. */
export function seasonAt(now: number, calendar: Calendar): Season {
  return calendar.pinnedSeason ?? SEASON_BY_MONTH[new Date(now).getUTCMonth()];
}

/** Holds the world in `season`, or hands it back to the real calendar with none. */
export function pinSeason(calendar: Calendar, season: Season | undefined): void {
  calendar.pinnedSeason = season;
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
