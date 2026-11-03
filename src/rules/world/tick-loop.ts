import { realClock, type Clock } from "./clock";

/** What a system is told about the tick it runs in. */
export interface Frame {
  /** Milliseconds since the loop started. */
  time: number;
  /** Milliseconds since the previous tick. */
  delta: number;
  /** Wall clock time of this tick (`Date.now()`). */
  now: number;
}

/** A function that runs once per tick and changes the world. */
export type System<W> = (world: W, frame: Frame) => void;

export interface TickLoop {
  start(): void;
  /** Stops ticking until `resume`. */
  pause(): void;
  resume(): void;
  /** Stops for good. */
  stop(): void;
  isRunning(): boolean;
  /** Runs one tick by hand. The loop calls this on a timer; tests call it directly. */
  step(delta?: number): void;
}

/**
 * A fixed-rate loop. Runs the systems in the given order, `fps` times a second. The timer
 * corrects for drift, so a slow tick is followed by a shorter wait.
 */
export function createTickLoop<W extends { tick: number }>(
  world: W,
  systems: Array<System<W>>,
  options: {
    fps: number;
    clock?: Clock;
    /** Called when a tick throws; the loop keeps going. Defaults to `console.error`. */
    onError?: (error: unknown) => void;
  },
): TickLoop {
  const interval = 1000 / options.fps;
  const { clock = realClock, onError = (error) => console.error("Tick failed", error) } = options;
  const now = () => clock.now();
  let cancel: (() => void) | null = null;
  let running = false;
  let startedAt = now();
  let lastTick = startedAt;
  let nextDue = startedAt;

  const step = (delta = interval) => {
    const at = now();
    const frame: Frame = { time: at - startedAt, delta, now: at };
    world.tick += 1;
    for (const system of systems) system(world, frame);
  };

  const schedule = () => {
    if (!running) return;
    nextDue += interval;
    const wait = Math.max(0, nextDue - now());
    cancel = clock.setTimer(() => {
      const at = now();
      const delta = at - lastTick;
      lastTick = at;
      try {
        step(delta);
      } catch (error) {
        onError(error);
      }
      schedule();
    }, wait);
  };

  const resume = () => {
    if (running) return;
    running = true;
    lastTick = nextDue = now();
    schedule();
  };

  const pause = () => {
    running = false;
    cancel?.();
    cancel = null;
  };

  return {
    start: () => {
      startedAt = now();
      resume();
    },
    pause,
    resume,
    stop: pause,
    isRunning: () => running,
    step,
  };
}
