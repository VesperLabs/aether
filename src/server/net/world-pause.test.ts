import { describe, expect, it } from "vitest";
import { createTickLoop } from "@/rules/world";
import type { ServerWorld } from "@/server/world/server-world";
import { createMemoryLogger } from "@/server/log/logger";
import { shouldPause } from "./world-pause";

function worldWith(players: Record<string, unknown>) {
  const log = createMemoryLogger();
  const world = { tick: 0, players, log } as unknown as ServerWorld;
  world.loop = createTickLoop(world, [], { fps: 1 });
  return { world, log };
}

describe("shouldPause", () => {
  it("does nothing (and logs nothing) for an empty world that was never running", () => {
    const { world, log } = worldWith({});
    shouldPause(world);
    expect(world.loop.isRunning()).toBe(false);
    expect(log.entries).toEqual([]);
  });

  it("resumes when a player joins and pauses once when the last one leaves", () => {
    const { world, log } = worldWith({ a: {} });
    shouldPause(world);
    expect(world.loop.isRunning()).toBe(true);
    world.players = {};
    shouldPause(world);
    shouldPause(world);
    expect(world.loop.isRunning()).toBe(false);
    expect(log.entries.map((e) => e.args[0])).toEqual([
      "🚦 Player joined. Resuming.",
      "🚦 Game empty. Pausing.",
    ]);
  });
});
