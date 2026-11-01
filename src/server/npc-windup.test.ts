import { describe, expect, it, vi } from "vitest";
import { createTimers } from "@/rules/world";
import { afterWindup, cancelWindupAt } from "./npc-windup";

describe("afterWindup", () => {
  const makeNpc = () => ({ windup: { seq: 0 }, timers: createTimers() });

  it("lands once the windup is over", () => {
    const npc = makeNpc();
    const land = vi.fn();
    afterWindup(npc, 300, "p1", land);
    npc.timers.advance(299);
    expect(land).not.toHaveBeenCalled();
    npc.timers.advance(1);
    expect(land).toHaveBeenCalledOnce();
  });
  it("never lands when called off for its target", () => {
    const npc = makeNpc();
    const land = vi.fn();
    afterWindup(npc, 300, "p1", land);
    expect(cancelWindupAt(npc, "p1")).toBe(true);
    npc.timers.advance(300);
    expect(land).not.toHaveBeenCalled();
  });
  it("leaves a windup at someone else alone", () => {
    const npc = makeNpc();
    const land = vi.fn();
    afterWindup(npc, 300, "p2", land);
    expect(cancelWindupAt(npc, "p1")).toBe(false);
    npc.timers.advance(300);
    expect(land).toHaveBeenCalledOnce();
  });
});
