import { describe, expect, it } from "vitest";
import { createTickLoop } from "@/rules/world";
import { createGameEventBus } from "@/rules/world/event-bus";
import type { ServerWorld } from "@/server/world/server-world";
import { createMemoryLogger } from "@/server/log/logger";
import { subscribeWorldPause } from "./world-pause";

function worldWith(players: Record<string, unknown>) {
  const log = createMemoryLogger();
  const events = createGameEventBus();
  const world = { tick: 0, players, log, events } as unknown as ServerWorld;
  world.loop = createTickLoop(world, [], { fps: 1 });
  subscribeWorldPause(events, world);
  return { world, log, events };
}

describe("subscribeWorldPause", () => {
  it("does nothing (and logs nothing) until a player joins or leaves", () => {
    const { world, log } = worldWith({});
    expect(world.loop.isRunning()).toBe(false);
    expect(log.entries).toEqual([]);
  });

  it("resumes on playerJoined and pauses once on the last playerLeft", () => {
    const { world, log, events } = worldWith({ a: {} });
    events.emit("playerJoined", { socketId: "a" });
    expect(world.loop.isRunning()).toBe(true);
    world.players = {};
    events.emit("playerLeft", { socketId: "a" });
    events.emit("playerLeft", { socketId: "a" });
    expect(world.loop.isRunning()).toBe(false);
    expect(log.entries.map((e) => e.args[0])).toEqual([
      "🚦 Player joined. Resuming.",
      "🚦 Game empty. Pausing.",
    ]);
  });
});
