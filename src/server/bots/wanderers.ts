import { Bot, wander } from "@/bots";
import { createRng, seedFromString } from "@/rules/world";
import { readRoomMap } from "../map-files";
import { realClock } from "./real-clock";
import { connectSocketLink } from "./socket-link";

const NAMES = ["Mira", "Oskar", "Tilde", "Bram", "Juno", "Ezra", "Wren", "Pell"];

/**
 * Brings wandering bots into the world: bots without cheats, named with "(bot)" so players can
 * tell, each roaming the maps. Resolves once they are in; `stop` sends them home.
 */
export async function startWanderers(url: string, count: number) {
  const life = new AbortController();
  const living: Promise<void>[] = [];
  const bots: Bot[] = [];
  for (let i = 0; i < count; i++) {
    const lap = Math.floor(i / NAMES.length);
    const name = `${NAMES[i % NAMES.length]}${lap ? ` ${lap + 1}` : ""} (bot)`;
    const link = await connectSocketLink(url);
    const bot = await Bot.join(link, { name, clock: realClock, maps: readRoomMap });
    bots.push(bot);
    const rng = createRng(seedFromString(name));
    living.push(wander(bot, { clock: realClock, rng, signal: life.signal }));
  }
  return {
    names: bots.map((a) => a.name),
    stop: async () => {
      life.abort();
      await Promise.allSettled(living);
      bots.forEach((a) => a.leave());
    },
  };
}
