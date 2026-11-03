/** Time and timers, passed in so a simulation can run on a virtual clock. */
export interface Clock {
  /** Wall clock time in milliseconds. */
  now(): number;
  /** Runs `run` after `ms`; returns a function that cancels it. */
  setTimer(run: () => void, ms: number): () => void;
}

/** The real clock: `Date.now()` and `setTimeout`. */
export const realClock: Clock = {
  // oxlint-disable-next-line no-restricted-properties -- the one place real time enters rules
  now: () => Date.now(),
  setTimer: (run, ms) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
};
