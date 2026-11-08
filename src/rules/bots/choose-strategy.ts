import type { BotStrategyId } from "@/content";
import { BOT_STRATEGY_STICKINESS } from "./constants";
import { BOT_STRATEGIES } from "./strategies/strategy-list";
import type { BotMind } from "./types";

/**
 * The strategy the bot wants most: each one's score times how much the personality likes it. The
 * current one gets a bonus, so a close call doesn't make the bot change its mind every time.
 */
export function chooseStrategy(mind: BotMind): BotStrategyId | null {
  let best: BotStrategyId | null = null;
  let bestScore = 0;
  for (const [id, weight] of Object.entries(mind.personality.strategies) as Array<
    [BotStrategyId, number]
  >) {
    const score = BOT_STRATEGIES[id].score(mind) * weight;
    const adjusted = id === mind.memory.strategy ? score * BOT_STRATEGY_STICKINESS : score;
    if (adjusted > bestScore) {
      best = id;
      bestScore = adjusted;
    }
  }
  return best;
}
