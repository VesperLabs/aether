import { describe, expect, it } from "vitest";
import type { Clock } from "./clock";
import { createTickLoop } from "./tick-loop";

/** A clock whose time only moves when the test advances it, firing due timers in order. */
function virtualClock() {
  let time = 1000;
  let nextId = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const clock: Clock = {
    now: () => time,
    setTimer: (run, ms) => {
      const id = nextId++;
      timers.set(id, { at: time + ms, run });
      return () => timers.delete(id);
    },
  };
  const advance = (ms: number) => {
    const end = time + ms;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      time = due[1].at;
      due[1].run();
    }
    time = end;
  };
  return { clock, advance, pending: () => timers.size };
}

describe("tick loop on an injected clock", () => {
  it("ticks at the given rate as virtual time advances, with no real waiting", () => {
    const { clock, advance } = virtualClock();
    const world = { tick: 0 };
    const frames: number[] = [];
    const loop = createTickLoop(world, [(_w, f) => frames.push(f.now)], { fps: 10, clock });
    loop.start();
    advance(1000);
    expect(world.tick).toBe(10);
    expect(frames[0]).toBe(1100);
    expect(frames[9]).toBe(2000);
  });

  it("stops scheduling when paused and picks up again on resume", () => {
    const { clock, advance, pending } = virtualClock();
    const world = { tick: 0 };
    const loop = createTickLoop(world, [], { fps: 10, clock });
    loop.start();
    advance(300);
    loop.pause();
    expect(pending()).toBe(0);
    advance(1000);
    expect(world.tick).toBe(3);
    loop.resume();
    advance(200);
    expect(world.tick).toBe(5);
  });

  it("reports a throwing system to onError and keeps ticking", () => {
    const { clock, advance } = virtualClock();
    const world = { tick: 0 };
    const errors: unknown[] = [];
    const loop = createTickLoop(
      world,
      [
        () => {
          throw new Error("boom");
        },
      ],
      { fps: 10, clock, onError: (e) => errors.push(e) },
    );
    loop.start();
    advance(300);
    expect(errors).toHaveLength(3);
    expect(world.tick).toBe(3);
  });
});
