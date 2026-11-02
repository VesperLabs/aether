import type { Brain } from "../brain";

/** How far from where it started a wanderer strolls, in pixels. */
const WANDER_RADIUS = 120;
const PAUSE_MS = { min: 500, max: 2500 };

/** Strolls to random spots near home and idles in between, like a player waiting around. */
export const wander: Brain = async (agent, { clock, rng, signal }) => {
  const home = { x: agent.senses.x, y: agent.senses.y };
  while (!signal.aborted) {
    const angle = rng() * Math.PI * 2;
    const reach = rng() * WANDER_RADIUS;
    /* A wall in the way just ends this stroll; the next one picks another spot */
    await agent.walkTo(home.x + Math.cos(angle) * reach, home.y + Math.sin(angle) * reach, 5000);
    await clock.sleep(PAUSE_MS.min + rng() * (PAUSE_MS.max - PAUSE_MS.min));
  }
};
