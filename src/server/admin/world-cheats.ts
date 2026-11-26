import { SEASONS } from "@/content";
import { findSeason, hourAt, pinSeason, seasonAt, setHour } from "@/rules/seasons";
import { SKIES, findSky, pinSky, weatherAt } from "@/rules/weather";
import type { Cheat } from "./cheat";

/**
 * `/season` names the season; `/season <name>` holds the world in it, for every player, until
 * `/season real` hands it back to the real calendar.
 */
const season: Cheat = (ctx, _player, [name], reply) => {
  const { world } = ctx;
  if (!name) {
    const pinned = world.calendar.pinnedSeason ? " (pinned)" : "";
    return reply.info(`It is ${seasonAt(world.now(), world.calendar)}${pinned}.`);
  }
  const real = name.toLowerCase() === "real";
  const chosen = real ? undefined : findSeason(name);
  if (!real && !chosen) return reply.error(`Usage: /season [${SEASONS.join("|")}|real]`);
  /* The tick's season announcement tells every client, this player included */
  pinSeason(world.calendar, chosen);
  reply.info(`It is now ${seasonAt(world.now(), world.calendar)}${real ? ", as on Earth" : ""}.`);
};

const formatHour = (hour: number) => {
  const minutes = Math.floor(hour * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

/** `/time` tells the hour; `/time <hour>` (0 to 24, fractions allowed) sets it for every player. */
const time: Cheat = (ctx, _player, [value], reply) => {
  const { world } = ctx;
  if (!value) return reply.info(`It is ${formatHour(hourAt(world.now(), world.calendar))}.`);
  const hour = Number(value);
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) return reply.error("Usage: /time [0-24]");
  setHour(world.calendar, world.now(), hour);
  world.io.emit("hourSet", hourAt(world.now(), world.calendar));
  reply.info(`It is now ${formatHour(hour % 24)}.`);
};

/**
 * `/weather` names the sky; `/weather <sky>` holds it, for every player, until `/weather real`
 * hands it back to the forecast.
 */
const weather: Cheat = (ctx, _player, [name], reply) => {
  const { world } = ctx;
  if (!name) {
    const pinned = world.weather.pinnedSky ? " (pinned)" : "";
    return reply.info(`The sky is ${weatherAt(world.now(), world.weather).sky}${pinned}.`);
  }
  const real = name.toLowerCase() === "real";
  const chosen = real ? undefined : findSky(name);
  if (!real && !chosen) return reply.error(`Usage: /weather [${SKIES.join("|")}|real]`);
  /* The tick's weather announcement tells every client, this player included */
  pinSky(world.weather, chosen);
  const now = weatherAt(world.now(), world.weather).sky;
  reply.info(`The sky is now ${now}${real ? ", as forecast" : ""}.`);
};

/** Cheats that change the whole world. */
export const WORLD_CHEATS = { season, time, weather };
