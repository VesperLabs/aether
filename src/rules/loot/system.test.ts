import { describe, expect, it, vi } from "vitest";
import type { MobKilledEvent } from "../events";
import { createGameEventBus } from "../world";
import { subscribeLoot } from "./system";
import type { LootHooks } from "./system";

const kill = (overrides: Partial<MobKilledEvent> = {}): MobKilledEvent => ({
  killerId: "p1",
  killerLevel: 10,
  killerMagicFind: 25,
  recipientIds: ["p1"],
  mobId: "m1",
  mobName: "slime",
  mobLevel: 16,
  roomName: "grassland-1",
  x: 10,
  y: 20,
  ...overrides,
});

const hooks = (overrides: Partial<LootHooks> = {}): LootHooks => ({
  rng: () => 0,
  rollWorldDrop: () => ({ key: "sword", slots: 0 }),
  buildItem: (ref) => ({ id: typeof ref === "string" ? ref : ref.key, rarity: "common" }),
  getMobDropInfo: () => undefined,
  spawnLoot: vi.fn(),
  ...overrides,
});

describe("subscribeLoot", () => {
  it("drops the rolled item where the mob died", () => {
    const bus = createGameEventBus();
    const h = hooks();
    subscribeLoot(bus, h);
    bus.emit("mobKilled", kill());
    expect(h.spawnLoot).toHaveBeenCalledWith("grassland-1", {
      x: 10,
      y: 20,
      item: { id: "sword", rarity: "common" },
      npcId: "m1",
    });
  });

  it("rolls the world drop with the mob's level and the killer's magic find", () => {
    const bus = createGameEventBus();
    const rollWorldDrop = vi.fn(() => null);
    subscribeLoot(bus, hooks({ rollWorldDrop }));
    bus.emit("mobKilled", kill());
    expect(rollWorldDrop).toHaveBeenCalledWith(16, 25);
  });

  it("uses the mob's drop table and noWorldDrops flag", () => {
    const bus = createGameEventBus();
    const rollWorldDrop = vi.fn(() => null);
    const h = hooks({
      rollWorldDrop,
      getMobDropInfo: () => ({
        noWorldDrops: true,
        drops: [{ item: "gold", chance: 1 }],
      }),
    });
    subscribeLoot(bus, h);
    bus.emit("mobKilled", kill());
    expect(rollWorldDrop).not.toHaveBeenCalled();
    expect(h.spawnLoot).toHaveBeenCalledTimes(1);
  });

  it("spawns nothing when nothing drops", () => {
    const bus = createGameEventBus();
    const h = hooks({ rollWorldDrop: () => null });
    subscribeLoot(bus, h);
    bus.emit("mobKilled", kill());
    expect(h.spawnLoot).not.toHaveBeenCalled();
  });

  it("stops after unsubscribing", () => {
    const bus = createGameEventBus();
    const h = hooks();
    const off = subscribeLoot(bus, h);
    off();
    bus.emit("mobKilled", kill());
    expect(h.spawnLoot).not.toHaveBeenCalled();
  });
});
