import type { Rng } from "@/rules/world";
import type { Planner } from "../planner";

/** How much more a wanderer likes a door to somewhere it hasn't been lately. */
const FRESH_DOOR_WEIGHT = 6;

/** One wanderer's temperament, rolled once so bots differ from each other. */
export interface Temperament {
  /** Share of walking speed: strollers dawdle, others hurry. */
  pace: number;
  /** How often it heads over to a keeper, player or sign. */
  curiosity: number;
  /** How likely it leaves the room after each goal; it grows bored the longer it stays. */
  restlessness: number;
}

function rollTemperament(rng: Rng): Temperament {
  return {
    pace: 0.5 + rng() * 0.5,
    curiosity: 0.2 + rng() * 0.4,
    restlessness: 0.15 + rng() * 0.3,
  };
}

/**
 * A planner made of weighted dice: a door more and more likely the longer it stays, favouring
 * rooms not seen lately; sometimes something to look at; otherwise a stroll.
 */
export function scriptedPlanner(rng: Rng, temperament = rollTemperament(rng)): Planner {
  return async ({ options, recentRooms, goalsHere }) => {
    const indexed = options.map((option, index) => ({ option, index }));
    const plan = (choice: number) => ({ choice, pace: temperament.pace });

    const leaveChance = 1 - (1 - temperament.restlessness) ** (goalsHere + 1);
    if (rng() < leaveChance) {
      const doors = indexed.flatMap(({ option, index }) =>
        option.kind === "door"
          ? [
              {
                value: index,
                weight: recentRooms.includes(option.door.destMap!) ? 1 : FRESH_DOOR_WEIGHT,
              },
            ]
          : [],
      );
      const chosen = pickWeighted(doors, rng);
      if (chosen !== undefined) return plan(chosen);
    }

    const sights = indexed.filter(({ option }) => option.kind === "visit");
    if (sights.length && rng() < temperament.curiosity) {
      return plan(sights[Math.floor(rng() * sights.length)].index);
    }

    const stroll = indexed.find(({ option }) => option.kind === "stroll");
    return plan((stroll ?? indexed[Math.floor(rng() * indexed.length)]).index);
  };
}

function pickWeighted<T>(options: { value: T; weight: number }[], rng: Rng): T | undefined {
  let roll = rng() * options.reduce((sum, o) => sum + o.weight, 0);
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option.value;
  }
  return undefined;
}
