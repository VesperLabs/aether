import type { Rng } from "@/rules/world";
import type { Bot } from "./bot";
import type { Clock } from "./link";

/** What a brain is given besides its bot: time, randomness, and a signal to stop. */
interface BrainLife {
  clock: Clock;
  rng: Rng;
  /** Aborted when the host wants the bot gone; a brain returns soon after. */
  signal: AbortSignal;
}

/**
 * What one bot decides, as a loop that runs until `signal` aborts. Brains only see the bot's
 * senses and act through its actions, so any brain runs on any host (a test, the game server,
 * a Cloudflare worker).
 */
export type Brain = (bot: Bot, life: BrainLife) => Promise<void>;
