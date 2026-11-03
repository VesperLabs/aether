import { describe, expect, it } from "vitest";
import { createManualClock } from "./clock";
import { createTickLoop } from "./tick-loop";
import { createWorld } from "./world";

describe("createManualClock", () => {
  it("runs due timers in order, each at its own time", () => {
    const clock = createManualClock(1000);
    const ran: Array<[string, number]> = [];
    clock.setTimer(() => ran.push(["b", clock.now()]), 200);
    clock.setTimer(() => ran.push(["a", clock.now()]), 100);
    clock.setTimer(() => ran.push(["c", clock.now()]), 200);
    clock.setTimer(() => ran.push(["late", clock.now()]), 500);
    clock.advance(300);
    expect(ran).toEqual([
      ["a", 1100],
      ["b", 1200],
      ["c", 1200],
    ]);
    expect(clock.now()).toBe(1300);
  });

  it("runs timers set by a timer when they fall inside the advance", () => {
    const clock = createManualClock();
    const ran: number[] = [];
    const again = () => {
      ran.push(clock.now());
      clock.setTimer(again, 100);
    };
    clock.setTimer(again, 100);
    clock.advance(350);
    expect(ran).toEqual([100, 200, 300]);
  });

  it("does not run a cancelled timer", () => {
    const clock = createManualClock();
    let ran = false;
    const cancel = clock.setTimer(() => (ran = true), 10);
    cancel();
    clock.advance(100);
    expect(ran).toBe(false);
  });

  it("fast-forwards a tick loop one normal tick at a time", () => {
    const clock = createManualClock();
    const deltas: number[] = [];
    const loop = createTickLoop(createWorld(), [(_w, frame) => deltas.push(frame.delta)], {
      fps: 20,
      clock,
    });
    loop.start();
    clock.advance(1000);
    expect(deltas).toHaveLength(20);
    expect(new Set(deltas)).toEqual(new Set([50]));
    loop.stop();
  });
});
