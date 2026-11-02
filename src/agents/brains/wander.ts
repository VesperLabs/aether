import type { Rng } from "@/rules/world";
import type { Agent } from "../agent";
import type { Brain } from "../brain";

/** How far from home a wanderer strolls, in pixels. */
const WANDER_RADIUS = 120;
const PAUSE_MS = { min: 500, max: 2500 };

/** Walks to one random spot near `home`. A wall in the way just ends the stroll early. */
export async function strollNear(agent: Agent, home: { x: number; y: number }, rng: Rng) {
  const angle = rng() * Math.PI * 2;
  const reach = rng() * WANDER_RADIUS;
  await agent.walkTo(home.x + Math.cos(angle) * reach, home.y + Math.sin(angle) * reach, 5000);
}

/** Strolls to random spots near home and idles in between, like a player waiting around. */
export const wander: Brain = async (agent, { clock, rng, signal }) => {
  const home = { x: agent.senses.x, y: agent.senses.y };
  while (!signal.aborted) {
    await strollNear(agent, home, rng);
    await clock.sleep(PAUSE_MS.min + rng() * (PAUSE_MS.max - PAUSE_MS.min));
  }
};
