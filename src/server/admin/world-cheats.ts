import { SEASONS } from "@/content";
import { findSeason, seasonAt, startSeason } from "@/rules/seasons";
import type { Cheat } from "./cheat";

/** `/season` names the season; `/season <name>` starts that one now, for every player. */
const season: Cheat = (ctx, _player, [name], reply) => {
  const { world } = ctx;
  if (!name) return reply.info(`It is ${seasonAt(world.now(), world.calendar)}.`);
  const chosen = findSeason(name);
  if (!chosen) return reply.error(`Usage: /season [${SEASONS.join("|")}]`);
  /* The tick's season announcement tells every client, this player included */
  startSeason(world.calendar, world.now(), chosen);
  reply.info(`It is now ${chosen}.`);
};

/** Cheats that change the whole world. */
export const WORLD_CHEATS = { season };
