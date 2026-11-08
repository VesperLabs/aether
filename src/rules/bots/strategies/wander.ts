import type { BotStrategy } from "../types";

/** Shortest and longest rest between strolls, ms. */
const MIN_REST_MS = 1000;
const MAX_REST_MS = 4000;

/** Stroll to a random spot near home, then rest. Picks a new spot every time it runs out. */
export const wander: BotStrategy = {
  score: ({ personality }) => (personality.wanderRadius > 0 ? 0.3 : 0),
  plan: ({ view, personality, rng }) => {
    const angle = rng() * Math.PI * 2;
    const distance = Math.sqrt(rng()) * personality.wanderRadius;
    const { home } = view.self;
    const to = {
      x: Math.round(home.x + Math.cos(angle) * distance),
      y: Math.round(home.y + Math.sin(angle) * distance),
    };
    const ms = Math.round(MIN_REST_MS + rng() * (MAX_REST_MS - MIN_REST_MS));
    return {
      id: "wander",
      steps: [
        { task: "walkTo", params: { to } },
        { task: "pause", params: { ms } },
      ],
      step: 0,
    };
  },
};
