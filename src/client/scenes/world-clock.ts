import type { Season } from "@/content";
import { hourAfter } from "@/rules/seasons";

/** Window event the HUD listens for when the world's season changes; `detail` is the season. */
export const SEASON_CHANGED_EVENT = "SEASON_CHANGED";

/** The last hour the server told us, and when, so the clock runs on between messages. */
let clock = { hour: 12, at: 0 };
let season: Season = "summer";

/** Starts the clock from an hour the server sent. */
export function setDayClock(hour: number) {
  clock = { hour, at: performance.now() };
}

/** The hour now, 0 to 24, by the client's clock. */
export const currentHour = () => hourAfter(clock.hour, performance.now() - clock.at);

/** The world's season, for HUD that mounts after it last changed. */
export const currentSeason = () => season;

export function announceSeason(next: Season) {
  if (next === season) return;
  season = next;
  window.dispatchEvent(new CustomEvent(SEASON_CHANGED_EVENT, { detail: next }));
}
