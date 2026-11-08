import type { BotChannel, BotIntent, WeightedIntent } from "./types";

/** One intent per channel: the highest priority wins, the first one on a tie. */
export function settleIntents(weighted: readonly WeightedIntent[]): BotIntent[] {
  const winners = new Map<BotChannel, WeightedIntent>();
  for (const candidate of weighted) {
    const current = winners.get(candidate.intent.channel);
    if (!current || candidate.priority > current.priority) {
      winners.set(candidate.intent.channel, candidate);
    }
  }
  return [...winners.values()].map(({ intent }) => intent);
}
