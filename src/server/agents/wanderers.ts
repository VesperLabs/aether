import { Agent, wander } from "@/agents";
import { createRng, seedFromString } from "@/rules/world";
import { readRoomMap } from "../map-files";
import { realClock } from "./real-clock";
import { connectSocketLink } from "./socket-link";

const NAMES = ["Mira", "Oskar", "Tilde", "Bram", "Juno", "Ezra", "Wren", "Pell"];

/**
 * Brings wandering bots into the world: agents without cheats, named with "(bot)" so players can
 * tell, each roaming the maps. Resolves once they are in; `stop` sends them home.
 */
export async function startWanderers(url: string, count: number) {
  const life = new AbortController();
  const living: Promise<void>[] = [];
  const agents: Agent[] = [];
  for (let i = 0; i < count; i++) {
    const lap = Math.floor(i / NAMES.length);
    const name = `${NAMES[i % NAMES.length]}${lap ? ` ${lap + 1}` : ""} (bot)`;
    const link = await connectSocketLink(url);
    const agent = await Agent.join(link, { name, clock: realClock, maps: readRoomMap });
    agents.push(agent);
    const rng = createRng(seedFromString(name));
    living.push(wander(agent, { clock: realClock, rng, signal: life.signal }));
  }
  return {
    names: agents.map((a) => a.name),
    stop: async () => {
      life.abort();
      await Promise.allSettled(living);
      agents.forEach((a) => a.leave());
    },
  };
}
