import { describe, expect, it } from "vitest";
import { createTimers } from ".";

describe("createTimers", () => {
  it("runs a callback only once its delay has passed in ticks", () => {
    const timers = createTimers();
    const ran: string[] = [];
    timers.advance(100);
    timers.after(50, () => ran.push("a"));
    timers.advance(49);
    expect(ran).toEqual([]);
    timers.advance(1);
    timers.advance(50);
    expect(ran).toEqual(["a"]);
  });

  it("never runs a cleared callback", () => {
    const timers = createTimers();
    const ran: string[] = [];
    timers.after(10, () => ran.push("a"));
    timers.clear();
    timers.advance(1000);
    expect(ran).toEqual([]);
  });
});
