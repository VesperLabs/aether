import { describe, expect, it } from "vitest";
import { createTickLoop } from "@/rules/world/tick-loop";
import { createSimClock } from "./sim-clock";

describe("createSimClock (manual)", () => {
  it("only fires timers when time is advanced", async () => {
    const clock = createSimClock({ fps: 10, mode: "manual" });
    const fired: number[] = [];
    clock.setTimer(() => fired.push(clock.now()), 50);
    await clock.settle();
    expect(fired).toEqual([]);
    await clock.advance(49);
    expect(fired).toEqual([]);
    await clock.advance(1);
    expect(fired).toEqual([50]);
    expect(clock.now()).toBe(50);
  });

  it("fires due timers in order of due time, then of scheduling", async () => {
    const clock = createSimClock({ fps: 10, mode: "manual", start: 1000 });
    const order: string[] = [];
    clock.setTimer(() => order.push("b"), 20);
    clock.setTimer(() => order.push("a"), 10);
    clock.setTimer(() => order.push("c"), 20);
    await clock.advance(100);
    expect(order).toEqual(["a", "b", "c"]);
    expect(clock.now()).toBe(1100);
  });

  it("fires timers scheduled by timers within the same advance", async () => {
    const clock = createSimClock({ fps: 10, mode: "manual" });
    const at: number[] = [];
    const again = () => {
      at.push(clock.now());
      clock.setTimer(again, 30);
    };
    clock.setTimer(again, 30);
    await clock.advance(100);
    expect(at).toEqual([30, 60, 90]);
  });

  it("cancels timers", async () => {
    const clock = createSimClock({ fps: 10, mode: "manual" });
    let fired = false;
    const cancel = clock.setTimer(() => (fired = true), 10);
    cancel();
    await clock.advance(20);
    expect(fired).toBe(false);
    expect(clock.pending()).toBe(0);
  });

  it("drives a tick loop exactly n ticks", async () => {
    const clock = createSimClock({ fps: 20, mode: "manual" });
    const world = { tick: 0 };
    const loop = createTickLoop(world, [], { fps: 20, clock });
    loop.start();
    await clock.ticks(5);
    expect(world.tick).toBe(5);
    expect(clock.now()).toBe(250);
    loop.stop();
  });

  it("lets I/O settle between timers", async () => {
    const clock = createSimClock({ fps: 10, mode: "manual" });
    const seen: string[] = [];
    clock.setTimer(() => setImmediate(() => seen.push("io")), 100);
    clock.setTimer(() => seen.push("tick"), 200);
    await clock.advance(200);
    expect(seen).toEqual(["io", "tick"]);
  });
});

describe("createSimClock (turbo)", () => {
  it("fires timers on its own and jumps time to them", async () => {
    const clock = createSimClock({ fps: 10, mode: "turbo" });
    const fired = await new Promise<number>((resolve) => {
      clock.setTimer(() => resolve(clock.now()), 60_000);
    });
    expect(fired).toBe(60_000);
  });

  it("runs a tick loop as fast as it can", async () => {
    const clock = createSimClock({ fps: 20, mode: "turbo" });
    const world = { tick: 0 };
    const loop = createTickLoop(world, [], { fps: 20, clock });
    loop.start();
    await clock.advance(10_000);
    expect(world.tick).toBe(200);
    loop.stop();
    clock.dispose();
  });

  it("advances time with no timers", async () => {
    const clock = createSimClock({ fps: 10, mode: "turbo" });
    await clock.advance(500);
    expect(clock.now()).toBe(500);
  });
});
