import { Agent, createResident, rulePlanner, type Planner } from "@/agents";
import { createRng, seedFromString } from "@/rules/world";
import { createJevPlanner } from "./jev-planner";
import { realClock } from "./real-clock";
import { connectSocketLink } from "./socket-link";

const NAMES = ["Mira", "Oskar", "Tilde", "Bram", "Juno", "Ezra", "Wren", "Pell"];

/** Jev when there is an API key, otherwise the rule planner. */
export function pickPlanner(apiKey = process.env.TYPESAFE_API_KEY): {
  planner: Planner;
  label: string;
} {
  return apiKey
    ? { planner: createJevPlanner(apiKey), label: "Jev" }
    : { planner: rulePlanner, label: "rules (set TYPESAFE_API_KEY for Jev)" };
}

/**
 * Brings residents into the world: agents without cheats, named with "(bot)" so players can
 * tell, each running the resident brain. Resolves once they are in; `stop` sends them home.
 */
export async function startResidents(url: string, count: number, planner: Planner) {
  const life = new AbortController();
  const living: Promise<void>[] = [];
  const agents: Agent[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${NAMES[i % NAMES.length]} (bot)`;
    const agent = await Agent.join(await connectSocketLink(url), { name, clock: realClock });
    agents.push(agent);
    const rng = createRng(seedFromString(name));
    living.push(createResident(planner)(agent, { clock: realClock, rng, signal: life.signal }));
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
