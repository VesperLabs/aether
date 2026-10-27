import { describe, expect, it } from "vitest";
import {
  LOOT_BUFFER_DELETE_TIME,
  LOOT_EXPIRE_TIME,
  LOOT_GRAB_RANGE,
  LOOT_SPAWN_CYCLE_TIME,
  addStackAmounts,
  createLoot,
  dropItemLevel,
  expireLoots,
  isMapLootDue,
  parseMapLootList,
  pickPreferredDrop,
  planMapLootSpawns,
  randomInt,
  resolveGrab,
  rollMobDrop,
} from "./rules";
import type { Loot } from "./rules";

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("randomInt", () => {
  it("maps rng onto the inclusive range", () => {
    expect(randomInt(() => 0, 1, 6)).toBe(1);
    expect(randomInt(() => 0.999, 1, 6)).toBe(6);
  });
  it("returns min for an empty range", () => {
    expect(randomInt(() => 0.5, 3, 3)).toBe(3);
    expect(randomInt(() => 0.5, 5, 2)).toBe(5);
  });
});

describe("pickPreferredDrop", () => {
  it("returns null with no runners", () => {
    expect(pickPreferredDrop([])).toBeNull();
  });
  it("takes the first valuable or non-stackable drop", () => {
    const a = { type: "stackable", rarity: "common" };
    const b = { type: "weapon", rarity: "common" };
    const c = { type: "stackable", rarity: "rare" };
    expect(pickPreferredDrop([a, b, c])).toBe(b);
    expect(pickPreferredDrop([a, c, b])).toBe(c);
  });
  it("falls back to the last stackable", () => {
    const a = { type: "stackable", rarity: "common" };
    const b = { type: "stackable", rarity: "common" };
    expect(pickPreferredDrop([a, b])).toBe(b);
  });
});

describe("dropItemLevel", () => {
  it("scales with mob level", () => {
    expect(dropItemLevel(1, 8)).toBe(1);
    expect(dropItemLevel(8, 8)).toBe(2);
    expect(dropItemLevel(16, 8)).toBe(3);
  });
});

describe("rollMobDrop", () => {
  const world = { type: "weapon", rarity: "common", key: "sword" };
  const base = { mobLevel: 16, magicFind: 7, ilvlMultiplier: 8 };

  it("passes item level and magic find to the world roll", () => {
    const calls: number[][] = [];
    const result = rollMobDrop(
      base,
      () => 0,
      (ilvl, mf) => (calls.push([ilvl, mf]), world),
    );
    expect(calls).toEqual([[3, 7]]);
    expect(result).toBe(world);
  });
  it("skips the world roll for noWorldDrops mobs", () => {
    let called = false;
    const result = rollMobDrop(
      { ...base, noWorldDrops: true },
      () => 0,
      () => ((called = true), world),
    );
    expect(called).toBe(false);
    expect(result).toBeNull();
  });
  it("adds drop table entries whose 1-in-N roll hits", () => {
    const hit = { type: "stackable", rarity: "common", key: "gold", chance: 4 };
    const miss = { type: "ring", rarity: "common", key: "band", chance: 4 };
    // rng 0 -> roll 1 (hit); rng 0.9 -> roll 4 (miss)
    const result = rollMobDrop(
      { ...base, noWorldDrops: true, drops: [hit, miss] },
      seq(0, 0.9),
      () => null,
    );
    expect(result).toBe(hit);
  });
  it("prefers a non-stackable world drop over later stackables", () => {
    const gold = {
      type: "stackable",
      rarity: "common",
      key: "gold",
      chance: 1,
    };
    expect(
      rollMobDrop(
        { ...base, drops: [gold] },
        () => 0,
        () => world,
      ),
    ).toBe(world);
  });
});

describe("createLoot", () => {
  const context = { id: "l1", roomName: "r", now: 100 };
  it("builds the loot on the ground", () => {
    expect(createLoot({ x: 5, y: 6, item: { id: "i" } }, context)).toEqual({
      id: "l1",
      roomName: "r",
      x: 5,
      y: 6,
      item: { id: "i" },
      dropTime: 100,
      texture: undefined,
      grabMessage: true,
      isPermanent: undefined,
    });
  });
  it("needs a position and an item", () => {
    expect(createLoot({ x: 0, y: 6, item: { id: "i" } }, context)).toBeNull();
    expect(createLoot({ x: 5, y: 0, item: { id: "i" } }, context)).toBeNull();
    expect(createLoot({ x: 5, y: 6, item: null }, context)).toBeNull();
    expect(createLoot(undefined, context)).toBeNull();
  });
});

describe("expireLoots", () => {
  const loot = (overrides: Partial<Loot> = {}): Loot => ({
    id: "a",
    roomName: "r",
    x: 1,
    y: 1,
    item: {},
    dropTime: 0,
    ...overrides,
  });

  it("leaves fresh loot alone", () => {
    expect(expireLoots([loot()], LOOT_EXPIRE_TIME)).toEqual({
      markExpired: [],
      remove: [],
    });
  });
  it("marks loot past its time, without removing it yet", () => {
    expect(expireLoots([loot()], LOOT_EXPIRE_TIME + 1)).toEqual({
      markExpired: ["a"],
      remove: [],
    });
  });
  it("removes loot once it has been expired long enough", () => {
    const expiredSince = 1000;
    const l = loot({ expiredSince });
    expect(expireLoots([l], expiredSince + LOOT_BUFFER_DELETE_TIME).remove).toEqual([]);
    expect(expireLoots([l], expiredSince + LOOT_BUFFER_DELETE_TIME + 1).remove).toEqual(["a"]);
  });
  it("never expires permanent loot", () => {
    expect(expireLoots([loot({ isPermanent: true })], LOOT_EXPIRE_TIME * 10)).toEqual({
      markExpired: [],
      remove: [],
    });
  });
});

describe("map loot", () => {
  it("parses the Loots object layer", () => {
    const items = [{ type: "stackable", rarity: "common", key: "gold", chance: 1 }];
    expect(
      parseMapLootList([{ id: 3, x: 10, y: 20, properties: [{ value: JSON.stringify(items) }] }]),
    ).toEqual([{ id: 3, x: 10, y: 20, items }]);
    expect(parseMapLootList(undefined)).toEqual([]);
  });

  it("is due after a full spawn cycle", () => {
    expect(isMapLootDue(LOOT_SPAWN_CYCLE_TIME, 0)).toBe(false);
    expect(isMapLootDue(LOOT_SPAWN_CYCLE_TIME + 1, 0)).toBe(true);
  });

  const spot = (x: number, items: Parameters<typeof planMapLootSpawns>[0][number]["items"]) => ({
    x,
    y: 5,
    items,
  });
  const build = (type: string, rarity: string, key: string, amount?: number) => ({
    type,
    rarity,
    key,
    amount,
  });

  it("spawns permanent sparkly loot where the roll hits", () => {
    const list = [
      spot(1, [
        {
          type: "stackable",
          rarity: "common",
          key: "gold",
          chance: 1,
          amount: [2, 4],
        },
      ]),
    ];
    const spawns = planMapLootSpawns(list, [], () => 0, build);
    expect(spawns).toEqual([
      {
        x: 1,
        y: 5,
        texture: "loot-anim-sparkle",
        isPermanent: true,
        item: { type: "stackable", rarity: "common", key: "gold", amount: 2 },
      },
    ]);
  });
  it("skips spots that already hold permanent loot, including ones planned this cycle", () => {
    const list = [
      spot(1, [{ type: "weapon", rarity: "common", key: "a", chance: 1 }]),
      spot(1, [{ type: "weapon", rarity: "common", key: "b", chance: 1 }]),
      spot(2, [{ type: "weapon", rarity: "common", key: "c", chance: 1 }]),
    ];
    const spawns = planMapLootSpawns(list, [{ x: 2, y: 5, isPermanent: true }], () => 0, build);
    expect(spawns.map((s) => (s.item as { key: string }).key)).toEqual(["a"]);
  });
  it("skips items that fail to build", () => {
    const list = [
      spot(1, [
        { type: "weapon", rarity: "common", key: "missing", chance: 1 },
        { type: "weapon", rarity: "common", key: "a", chance: 1 },
      ]),
      spot(2, [{ type: "weapon", rarity: "common", key: "missing", chance: 1 }]),
    ];
    const buildKnown = (type: string, rarity: string, key: string, amount?: number) =>
      key === "missing" ? null : build(type, rarity, key, amount);
    const spawns = planMapLootSpawns(list, [], () => 0, buildKnown);
    expect(spawns.map((s) => [s.x, (s.item as { key: string }).key])).toEqual([[1, "a"]]);
  });
  it("spawns nothing when no roll hits", () => {
    const list = [spot(1, [{ type: "weapon", rarity: "common", key: "a", chance: 10 }])];
    expect(planMapLootSpawns(list, [], () => 0.5, build)).toEqual([]);
  });
});

describe("resolveGrab", () => {
  const free = {
    hasGrabber: true,
    hasStackToJoin: false,
    inventoryFull: false,
  };
  const loot = { item: { type: "weapon" } };

  it("picks up into a free slot", () => {
    expect(resolveGrab({ ...free, loot })).toBe("pickup");
  });
  it("ignores missing, expired or itemless loot", () => {
    expect(resolveGrab({ ...free, loot: undefined })).toBe("ignore");
    expect(resolveGrab({ ...free, loot: { ...loot, expiredSince: 1 } })).toBe("ignore");
    expect(resolveGrab({ ...free, loot: { item: null } })).toBe("ignore");
  });
  it("ignores a missing or dead grabber", () => {
    expect(resolveGrab({ ...free, loot, hasGrabber: false })).toBe("ignore");
    expect(resolveGrab({ ...free, loot, grabberIsDead: true })).toBe("ignore");
  });
  describe("range and room", () => {
    const placed = { item: { type: "weapon" }, roomName: "a", x: 100, y: 100 };
    const at = (x: number, y: number, roomName = "a") => ({
      ...free,
      loot: placed,
      grabberPosition: { roomName, x, y },
    });
    it("allows a grab within range, including exactly at the limit", () => {
      expect(resolveGrab(at(100, 100))).toBe("pickup");
      expect(resolveGrab(at(100 + LOOT_GRAB_RANGE, 100))).toBe("pickup");
    });
    it("ignores a grab from beyond the range", () => {
      expect(resolveGrab(at(100 + LOOT_GRAB_RANGE + 1, 100))).toBe("ignore");
      expect(resolveGrab(at(100 + 50, 100 + 50))).toBe("ignore");
    });
    it("ignores a grab from another room", () => {
      expect(resolveGrab(at(100, 100, "b"))).toBe("ignore");
    });
    it("ignores loot with no position", () => {
      expect(
        resolveGrab({
          ...free,
          loot,
          grabberPosition: { roomName: "a", x: 0, y: 0 },
        }),
      ).toBe("ignore");
    });
  });
  it("reports a full inventory", () => {
    expect(resolveGrab({ ...free, loot, inventoryFull: true })).toBe("inventoryFull");
  });
  it("stacks onto an existing stack even when the inventory is full", () => {
    const stackable = { item: { type: "stackable" } };
    expect(
      resolveGrab({
        ...free,
        loot: stackable,
        hasStackToJoin: true,
        inventoryFull: true,
      }),
    ).toBe("stack");
    expect(resolveGrab({ ...free, loot: stackable, inventoryFull: true })).toBe("inventoryFull");
    expect(resolveGrab({ ...free, loot, hasStackToJoin: true })).toBe("pickup");
  });
});

describe("addStackAmounts", () => {
  it("adds numbers, strings and missing values", () => {
    expect(addStackAmounts(2, 3)).toBe(5);
    expect(addStackAmounts("2", "3")).toBe(5);
    expect(addStackAmounts(undefined, 3)).toBe(3);
    expect(addStackAmounts(2, undefined)).toBe(2);
  });
});
