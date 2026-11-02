import type { SetTimer } from "@/rules/world";

/** A fixed start, so runs replay exactly. Real-looking, since a time of 0 reads as "never". */
const EPOCH = Date.UTC(2026, 0, 1);

interface Timer {
  at: number;
  /** Breaks ties: timers due at the same time run in the order they were set. */
  order: number;
  run: () => void;
}

/**
 * Time that only moves when asked: `fireNext` jumps straight to the earliest timer and runs it.
 * Hand its `setTimer` to the tick loop and its `sleep` to bots, and they share one clock.
 */
export function createVirtualTime(start = EPOCH) {
  let now = start;
  let order = 0;
  const timers: Timer[] = [];

  const setTimer: SetTimer = (run, ms) => {
    const timer = { at: now + Math.max(0, ms), order: order++, run };
    timers.push(timer);
    return () => {
      const index = timers.indexOf(timer);
      if (index >= 0) timers.splice(index, 1);
    };
  };

  return {
    now: () => now,
    setTimer,
    sleep: (ms: number) => new Promise<void>((resolve) => setTimer(resolve, ms)),
    /** Jumps to the earliest timer and runs it. Returns false when none are waiting. */
    fireNext(): boolean {
      if (timers.length === 0) return false;
      let next = 0;
      for (let i = 1; i < timers.length; i++) {
        const t = timers[i];
        if (t.at < timers[next].at || (t.at === timers[next].at && t.order < timers[next].order)) {
          next = i;
        }
      }
      const [timer] = timers.splice(next, 1);
      now = Math.max(now, timer.at);
      timer.run();
      return true;
    },
  };
}
