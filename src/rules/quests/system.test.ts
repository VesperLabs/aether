import { describe, expect, it, vi } from "vitest";
import type { MobKilledEvent } from "../events";
import { createGameEventBus } from "../world";
import { subscribeQuests } from "./system";

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

describe("subscribeQuests", () => {
  it("counts the kill for every recipient", () => {
    const bus = createGameEventBus();
    const addKill = vi.fn();
    subscribeQuests(bus, addKill);
    const event = kill();
    bus.emit("mobKilled", event);
    expect(addKill).toHaveBeenCalledTimes(2);
    expect(addKill).toHaveBeenNthCalledWith(1, "p1", "slime", event);
    expect(addKill).toHaveBeenNthCalledWith(2, "p2", "slime", event);
  });

  it("stops counting after unsubscribing", () => {
    const bus = createGameEventBus();
    const addKill = vi.fn();
    const unsubscribe = subscribeQuests(bus, addKill);
    unsubscribe();
    bus.emit("mobKilled", kill());
    expect(addKill).not.toHaveBeenCalled();
  });

  it("counts nothing when nobody shares the kill", () => {
    const bus = createGameEventBus();
    const addKill = vi.fn();
    subscribeQuests(bus, addKill);
    bus.emit("mobKilled", kill({ recipientIds: [] }));
    expect(addKill).not.toHaveBeenCalled();
  });
});
