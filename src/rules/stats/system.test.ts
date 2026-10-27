import { describe, expect, it, vi } from "vitest";
import type { MobKilledEvent } from "../events";
import { createGameEventBus } from "../world";
import { expForMobKill, subscribeStats } from "./system";

const kill = (overrides: Partial<MobKilledEvent> = {}): MobKilledEvent => ({
  killerId: "p1",
  killerLevel: 10,
  killerMagicFind: 1,
  recipientIds: ["p1", "p2"],
  mobId: "m1",
  mobName: "slime",
  mobLevel: 10,
  roomName: "grassland-1",
  x: 10,
  y: 20,
  ...overrides,
});

describe("expForMobKill", () => {
  it("uses the killer's level and the mob's level", () => {
    expect(expForMobKill(kill())).toBe(5);
    expect(expForMobKill(kill({ killerLevel: 30, mobLevel: 10 }))).toBe(0);
    expect(expForMobKill(kill({ killerLevel: 1, mobLevel: 40 }))).toBe(20);
  });
});

describe("subscribeStats", () => {
  it("awards the kill's exp to every recipient", () => {
    const bus = createGameEventBus();
    const award = vi.fn();
    subscribeStats(bus, award);
    const event = kill();
    bus.emit("mobKilled", event);
    expect(award).toHaveBeenCalledTimes(2);
    expect(award).toHaveBeenNthCalledWith(1, "p1", 5, event);
    expect(award).toHaveBeenNthCalledWith(2, "p2", 5, event);
  });

  it("stops awarding after unsubscribing", () => {
    const bus = createGameEventBus();
    const award = vi.fn();
    const unsubscribe = subscribeStats(bus, award);
    unsubscribe();
    bus.emit("mobKilled", kill());
    expect(award).not.toHaveBeenCalled();
  });

  it("awards nothing when nobody shares the kill", () => {
    const bus = createGameEventBus();
    const award = vi.fn();
    subscribeStats(bus, award);
    bus.emit("mobKilled", kill({ recipientIds: [] }));
    expect(award).not.toHaveBeenCalled();
  });
});
