import {
  Agent,
  createResident,
  createUtilityPlanner,
  rollPersonality,
  type Planner,
} from "@/agents";
import { createRng, seedFromString, type Rng } from "@/rules/world";
import { createJevPlanner } from "./jev-planner";
import { realClock } from "./real-clock";
import { connectSocketLink } from "./socket-link";

const NAMES = ["Mira", "Oskar", "Tilde", "Bram", "Juno", "Ezra", "Wren", "Pell"];

/** Makes the planner for one resident from its own dice. */
type PlannerFor = (rng: Rng) => Planner;

/** Jev when there is an API key, otherwise a free utility planner with its own personality. */
export function pickPlanner(apiKey = process.env.TYPESAFE_API_KEY): {
  plannerFor: PlannerFor;
  label: string;
} {
  if (apiKey) {
    const jev = createJevPlanner(apiKey);
    return { plannerFor: () => jev, label: "Jev" };
  }
  return {
    plannerFor: (rng) => createUtilityPlanner(rollPersonality(rng), rng),
    label: "personalities (set TYPESAFE_API_KEY for Jev)",
  };
}

/**
 * Brings residents into the world: agents without cheats, named with "(bot)" so players can
 * tell, each running the resident brain. Resolves once they are in; `stop` sends them home.
 */
export async function startResidents(url: string, count: number, plannerFor: PlannerFor) {
  const life = new AbortController();
  const living: Promise<void>[] = [];
  const agents: Agent[] = [];
  for (let i = 0; i < count; i++) {
    const lap = Math.floor(i / NAMES.length);
    const name = `${NAMES[i % NAMES.length]}${lap ? ` ${lap + 1}` : ""} (bot)`;
    const agent = await Agent.join(await connectSocketLink(url), { name, clock: realClock });
    agents.push(agent);
    const rng = createRng(seedFromString(name));
    const brain = createResident(plannerFor(rng));
    living.push(brain(agent, { clock: realClock, rng, signal: life.signal }));
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
