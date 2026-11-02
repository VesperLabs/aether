import type { Rng } from "@/rules/world";
import type { Planner } from "./planner";

/** How much an agent likes each option, 0 to 1. Options it has no taste for score `fallback`. */
export type Personality = Record<string, number>;

/** How much the dice can sway a choice, so the same personality doesn't act like a clock. */
const WHIM = 0.25;

/** A personality rolled from the dice: each resident gets its own taste for talking and fighting. */
export function rollPersonality(rng: Rng): Personality {
  return {
    rest: 1.5, // only offered when hurt, so it always wins
    greet: 0.2 + rng() * 0.8,
    hunt: 0.2 + rng() * 0.8,
    wander: 0.3,
  };
}

/**
 * A planner without a model: scores each option by personality plus a little chance and picks
 * the best. Free, instant and deterministic for a given rng, so it runs anywhere agents do.
 */
export function createUtilityPlanner(personality: Personality, rng: Rng, fallback = 0.1): Planner {
  return async (_situation, _question, options) => {
    let choice = Object.keys(options)[0];
    let best = -Infinity;
    for (const id of Object.keys(options)) {
      const score = (personality[id] ?? fallback) + rng() * WHIM;
      if (score > best) [choice, best] = [id, score];
    }
    return { choice, confidence: 1 };
  };
}
