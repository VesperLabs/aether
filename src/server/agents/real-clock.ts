import type { Clock } from "@/agents";

/** Wall-clock time, for agents playing on a live server. */
export const realClock: Clock = {
  now: () => performance.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
