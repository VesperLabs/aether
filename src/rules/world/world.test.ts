import { afterEach, describe, expect, it, vi } from "vitest";
import { moveBodyThroughMap, type TiledMapJson } from "../movement";
import { addRoom, createRoom, createTickLoop, createWorld, entitiesInRoom, nearestTo } from ".";

const json: TiledMapJson = {
  width: 3,
  height: 3,
  tilewidth: 32,
  tileheight: 32,
  tilesets: [],
  layers: [
    { name: "Collide", type: "tilelayer", data: new Array(9).fill(0) },
    {
      name: "Doors",
      type: "objectgroup",
      objects: [
        {
          name: "door-a",
          x: 0,
          y: 64,
          width: 32,
          height: 16,
          properties: [
            { name: "destMap", value: "other" },
            { name: "destDoor", value: "door-b" },
          ],
        },
      ],
    },
  ],
};

afterEach(() => vi.useRealTimers());

describe("world", () => {
  it("builds rooms with doors and registers them", () => {
    const world = createWorld();
    addRoom(world, createRoom("test", json, 1000));
    expect(world.rooms.test.map.widthInPixels).toBe(96);
    expect(world.doors.test["door-a"]).toMatchObject({
      destMap: "other",
      destDoor: "door-b",
      centerPos: { x: 16, y: 72 },
    });
  });

  it("finds entities in a room and the nearest one", () => {
    const world = createWorld<{ x: number; y: number; room: { name: string } | null }>();
    world.players.a = { x: 0, y: 0, room: { name: "test" } };
    world.players.b = { x: 10, y: 0, room: { name: "test" } };
    world.players.c = { x: 1, y: 0, room: null };
    const inRoom = entitiesInRoom(world.players, "test");
    expect(inRoom).toHaveLength(2);
    expect(nearestTo(inRoom, { x: 9, y: 0 })).toBe(world.players.b);
  });

  it("runs systems in order each tick and moves bodies", () => {
    const world = createWorld<
      never,
      { x: number; y: number; vx: number; vy: number; bodySize: number }
    >();
    addRoom(world, createRoom("test", json, 0));
    world.npcs.n = { x: 20, y: 20, vx: 0, vy: 0, bodySize: 8 };
    const order: string[] = [];
    const loop = createTickLoop(
      world,
      [
        (w) => {
          order.push("ai");
          w.npcs.n.vx = 40;
        },
        (w, frame) => {
          order.push("move");
          moveBodyThroughMap(w.rooms.test.map, w.npcs.n, frame.delta / 1000);
        },
      ],
      { fps: 20 },
    );
    loop.step(50);
    loop.step(50);
    expect(order).toEqual(["ai", "move", "ai", "move"]);
    expect(world.tick).toBe(2);
    expect(world.npcs.n.x).toBeCloseTo(24);
  });

  it("ticks on a timer at the given rate and can pause", () => {
    vi.useFakeTimers();
    const world = createWorld();
    let ticks = 0;
    const loop = createTickLoop(world, [() => ticks++], { fps: 20 });
    loop.start();
    vi.advanceTimersByTime(1000);
    expect(ticks).toBeGreaterThanOrEqual(19);
    expect(ticks).toBeLessThanOrEqual(21);
    loop.pause();
    const paused = ticks;
    vi.advanceTimersByTime(1000);
    expect(ticks).toBe(paused);
    loop.resume();
    vi.advanceTimersByTime(100);
    expect(ticks).toBeGreaterThan(paused);
    loop.stop();
  });
});
