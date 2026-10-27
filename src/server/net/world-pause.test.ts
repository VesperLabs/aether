import { afterEach, describe, expect, it, vi } from "vitest";
import { createTickLoop } from "@/shared/rules/world";
import type { ServerWorld } from "../server-world";
import { shouldPause } from "./world-pause";

function worldWith(players: Record<string, unknown>) {
  const world = { tick: 0, players } as unknown as ServerWorld;
  world.loop = createTickLoop(world, [], { fps: 1 });
  return world;
}

describe("shouldPause", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does nothing (and logs nothing) for an empty world that was never running", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const world = worldWith({});
    shouldPause(world);
    expect(world.loop.isRunning()).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it("resumes when a player joins and pauses once when the last one leaves", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const world = worldWith({ a: {} });
    shouldPause(world);
    expect(world.loop.isRunning()).toBe(true);
    world.players = {};
    shouldPause(world);
    shouldPause(world);
    expect(world.loop.isRunning()).toBe(false);
    expect(log.mock.calls.map(([message]) => message)).toEqual([
      "🚦 Player joined. Resuming.",
      "🚦 Game empty. Pausing.",
    ]);
  });
});
