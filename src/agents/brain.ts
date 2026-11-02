import type { Rng } from "@/rules/world";
import type { Agent } from "./agent";
import type { Clock } from "./link";

/** What a brain is given besides its agent: time, randomness, and a signal to stop. */
interface BrainLife {
  clock: Clock;
  rng: Rng;
  /** Aborted when the host wants the agent gone; a brain returns soon after. */
  signal: AbortSignal;
}

/**
 * What one agent decides, as a loop that runs until `signal` aborts. Brains only see the agent's
 * senses and act through its actions, so any brain runs on any host (a test, the game server,
 * a Cloudflare worker).
 */
export type Brain = (agent: Agent, life: BrainLife) => Promise<void>;
