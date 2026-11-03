/** Runs `run` after `ms`; returns a function that cancels it. */
type SetTimer = (run: () => void, ms: number) => () => void;

/**
 * The one source of time for a world: what time it is, and how to wait. The live server uses
 * the wall clock; tests and tools use a manual one they move forward themselves.
 */
export interface Clock {
  now(): number;
  setTimer: SetTimer;
}

/** A clock that only moves when told to, so a test can fast-forward the whole world. */
export interface ManualClock extends Clock {
  /**
   * Moves time on by `ms`, running each timer as it comes due, earliest first, with `now()` set
   * to its due time. A tick loop on this clock runs every tick in between, each a normal tick.
   */
  advance(ms: number): void;
}

export function createManualClock(start = 0): ManualClock {
  let time = start;
  let nextId = 0;
  const pending = new Map<number, { due: number; run: () => void }>();

  /* Map order is insertion order, so timers due at the same time run in the order they were set. */
  const earliest = () => {
    let found: [number, { due: number; run: () => void }] | undefined;
    for (const entry of pending) if (!found || entry[1].due < found[1].due) found = entry;
    return found;
  };

  return {
    now: () => time,
    setTimer(run, ms) {
      const id = nextId++;
      pending.set(id, { due: time + Math.max(0, ms), run });
      return () => pending.delete(id);
    },
    advance(ms) {
      const end = time + ms;
      for (let next = earliest(); next && next[1].due <= end; next = earliest()) {
        pending.delete(next[0]);
        time = next[1].due;
        next[1].run();
      }
      time = end;
    },
  };
}
