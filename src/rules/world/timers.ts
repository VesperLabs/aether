/**
 * Delayed callbacks driven by the tick loop instead of `setTimeout`, so they stop with the world
 * and tests can run them by stepping ticks.
 */
export interface Timers {
  /** Runs `run` once `delayMs` of ticks have passed. */
  after(delayMs: number, run: () => void): void;
  /** Moves the clock on by one tick of `deltaMs` and runs every callback now due, oldest first. */
  advance(deltaMs: number): void;
  /** Drops every pending callback. */
  clear(): void;
}

export function createTimers(): Timers {
  let now = 0;
  let pending: Array<{ due: number; run: () => void }> = [];
  return {
    after(delayMs, run) {
      pending.push({ due: now + delayMs, run });
    },
    advance(deltaMs) {
      now += deltaMs;
      const due = pending.filter((timer) => timer.due <= now);
      pending = pending.filter((timer) => timer.due > now);
      for (const timer of due) timer.run();
    },
    clear() {
      pending = [];
    },
  };
}
