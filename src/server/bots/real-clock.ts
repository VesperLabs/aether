import type { Clock } from "@/bots";

/** Wall-clock time, for bots playing on a live server. */
export const realClock: Clock = {
  now: () => performance.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
