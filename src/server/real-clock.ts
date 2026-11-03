import type { Clock } from "@/rules/world";

/** The wall clock the live server runs on. */
export const realClock: Clock = {
  now: () => Date.now(),
  setTimer: (run, ms) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
};
