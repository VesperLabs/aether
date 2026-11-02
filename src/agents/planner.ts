/** The options a planner picks from: id → what the option means, in plain words. */
type Options = Record<string, string>;

interface Plan {
  /** One of the option ids. */
  choice: string;
  /** 0 to 1: how sure the planner is. Brains fall back to something safe when it is low. */
  confidence: number;
}

/**
 * Picks one option for a situation described in words. Hosts back it with a model (Jev's Choice
 * question takes exactly this shape); tests use `rulePlanner`. It never acts, it only chooses, so a
 * planner can't make an agent do anything its brain didn't offer.
 */
export type Planner = (situation: string, question: string, options: Options) => Promise<Plan>;

/**
 * A planner without a model: takes the first option offered. Brains list options most urgent
 * first, so this behaves sensibly, needs no API key and is deterministic in tests.
 */
export const rulePlanner: Planner = async (_situation, _question, options) => ({
  choice: Object.keys(options)[0],
  confidence: 1,
});
