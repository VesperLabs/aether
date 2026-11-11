import { seasonAt } from "@/rules/seasons";
import type { System } from "@/rules/world";
import type { ServerWorld } from "./server-world";

/**
 * Tells every client when the world turns to a new season, by the clock or by `/season`. Clients
 * learn the season they start in from `heroInit` and `roomObserved`.
 */
export const announceSeason: System<ServerWorld> = (world) => {
  const season = seasonAt(world.now(), world.calendar);
  if (season === world.announcedSeason) return;
  world.announcedSeason = season;
  world.io.emit("seasonChanged", season);
};
