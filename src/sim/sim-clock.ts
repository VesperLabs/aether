import type { Clock } from "@/rules/world/clock";

/**
 * `manual`: timers only fire when the test calls `ticks` or `advance`.
 * `turbo`: due timers fire on `setImmediate` and time jumps straight to them, as fast as the CPU
 * allows.
 */
export type SimClockMode = "manual" | "turbo";

/** A virtual clock for simulations: time only moves when timers fire or a test advances it. */
export interface SimClock extends Clock {
  mode: SimClockMode;
  /** Milliseconds per tick at the configured fps. */
  interval: number;
  /** Moves time forward `ms`, firing every timer due on the way, in order. */
  advance(ms: number): Promise<void>;
  /** Moves time forward `n` ticks. */
  ticks(n: number): Promise<void>;
  /** Timers waiting to fire. */
  pending(): number;
  /** Lets pending socket I/O settle: a few turns of the event loop. */
  settle(): Promise<void>;
  /** Drops every timer and stops the turbo pump. */
  dispose(): void;
}

interface Timer {
  due: number;
  seq: number;
  run: () => void;
}

/** Event loop turns `settle` waits: enough for loopback socket writes and reads to land. */
const SETTLE_TURNS = 10;

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

export function createSimClock({
  fps,
  mode,
  start = 0,
}: {
  fps: number;
  mode: SimClockMode;
  start?: number;
}): SimClock {
  const interval = 1000 / fps;
  let time = start;
  let seq = 0;
  let timers: Timer[] = [];
  let pumping = false;
  let disposed = false;
  /** Turbo waiters, resolved once time reaches their target. */
  let waiters: Array<{ at: number; resolve: () => void }> = [];

  /** The earliest timer due by `limit` (ties go to the one scheduled first), removed from the queue. */
  const takeNext = (limit: number) => {
    let best: Timer | undefined;
    for (const timer of timers) {
      if (timer.due > limit) continue;
      if (!best || timer.due < best.due || (timer.due === best.due && timer.seq < best.seq)) {
        best = timer;
      }
    }
    if (best) timers = timers.filter((t) => t !== best);
    return best;
  };

  const fire = (timer: Timer) => {
    time = Math.max(time, timer.due);
    timer.run();
  };

  const wakeWaiters = () => {
    const ready = waiters.filter((w) => w.at <= time);
    waiters = waiters.filter((w) => w.at > time);
    for (const w of ready) w.resolve();
  };

  /** Turbo: fire the next timer on the next turn, so I/O still gets its share of the loop. */
  const pump = () => {
    if (pumping || disposed) return;
    pumping = true;
    setImmediate(() => {
      pumping = false;
      if (disposed) return;
      const nextWait = waiters.reduce((min, w) => Math.min(min, w.at), Infinity);
      const timer = takeNext(nextWait);
      if (timer) fire(timer);
      else if (waiters.length) time = Math.max(time, nextWait);
      wakeWaiters();
      if (timers.length || waiters.length) pump();
    });
  };

  const settle = async () => {
    for (let i = 0; i < SETTLE_TURNS; i++) await nextTurn();
  };

  const advance = async (ms: number) => {
    const target = time + ms;
    if (mode === "turbo") {
      if (target <= time) return;
      await new Promise<void>((resolve) => {
        waiters.push({ at: target, resolve });
        pump();
      });
      return;
    }
    await settle();
    for (let timer = takeNext(target); timer; timer = takeNext(target)) {
      fire(timer);
      await settle();
    }
    time = Math.max(time, target);
  };

  return {
    mode,
    interval,
    now: () => time,
    setTimer(run, ms) {
      const timer: Timer = { due: time + Math.max(0, ms), seq: seq++, run };
      timers.push(timer);
      if (mode === "turbo") pump();
      return () => {
        timers = timers.filter((t) => t !== timer);
      };
    },
    advance,
    ticks: (n) => advance(n * interval),
    pending: () => timers.length,
    settle,
    dispose() {
      disposed = true;
      timers = [];
      for (const w of waiters) w.resolve();
      waiters = [];
    },
  };
}
