import { describe, expect, it } from "vitest";
import { createVirtualTime } from "./virtual-time";

describe("createVirtualTime", () => {
  it("jumps to timers in time order, ties in the order they were set", () => {
    const time = createVirtualTime(1000);
    const ran: string[] = [];
    time.setTimer(() => ran.push("late"), 50);
    time.setTimer(() => ran.push("early"), 10);
    time.setTimer(() => ran.push("early too"), 10);

    while (time.fireNext());

    expect(ran).toEqual(["early", "early too", "late"]);
    expect(time.now()).toBe(1050);
  });

  it("skips cancelled timers and reports when none are left", () => {
    const time = createVirtualTime(0);
    let ran = false;
    const cancel = time.setTimer(() => (ran = true), 5);
    cancel();
    expect(time.fireNext()).toBe(false);
    expect(ran).toBe(false);
  });

  it("resolves sleeps when time reaches them", async () => {
    const time = createVirtualTime(0);
    const slept = time.sleep(30_000);
    time.fireNext();
    await slept;
    expect(time.now()).toBe(30_000);
  });
});
