/** The long-term aims a bot can pick between. Each id has one strategy in `rules/bots/strategies/`. */
const BOT_STRATEGY_IDS = ["idle", "wander"] as const;
export type BotStrategyId = (typeof BOT_STRATEGY_IDS)[number];

/**
 * How a bot behaves, and nothing else. The character it plays (class, gear, look, name) is picked
 * separately when it spawns, so any personality can play any class.
 */
export interface BotPersonality {
  description: string;
  /** Multiplies each strategy's score. A strategy left out is never chosen. */
  strategies: Partial<Record<BotStrategyId, number>>;
  /** How far from where it spawned it wanders, in pixels. */
  wanderRadius: number;
}

export const botPersonalities = {
  idler: {
    description: "Stands around",
    strategies: { idle: 1 },
    wanderRadius: 0,
  },
  wanderer: {
    description: "Strolls around near where it spawned",
    strategies: { idle: 1, wander: 1 },
    wanderRadius: 160,
  },
} as const satisfies Record<string, BotPersonality>;

export type BotPersonalityId = keyof typeof botPersonalities;

export const BOT_PERSONALITY_IDS = Object.keys(botPersonalities) as BotPersonalityId[];

export function isBotPersonalityId(id: string): id is BotPersonalityId {
  return id in botPersonalities;
}
