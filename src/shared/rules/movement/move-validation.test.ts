import { describe, expect, it } from "vitest";
import {
  DOOR_USE_RANGE,
  buildTileGrid,
  checkMove,
  isWithinDoorRange,
  startMoveTrack,
  type MoveContext,
  type TiledMapJson,
} from ".";

/** 10x10 map of 32px tiles with a wall column at tile x=5, except the bottom row (a gap). */
const solidData = Array.from({ length: 100 }, (_, i) => (i % 10 === 5 && i < 90 ? 2 : 0));
const map: TiledMapJson = {
  width: 10,
  height: 10,
  tilewidth: 32,
  tileheight: 32,
  tilesets: [{ firstgid: 1, tiles: [{ id: 1, properties: [{ name: "collides", value: true }] }] }],
  layers: [{ name: "Collide", type: "tilelayer", data: solidData }],
};
const ctx: MoveContext = {
  grid: buildTileGrid(map),
  bounds: { width: 320, height: 320 },
  walkSpeed: 100,
  bodySize: 8,
  bodyOffsetY: 0,
};
const start = () => startMoveTrack("town", 50, 50, 0, 100);

describe("checkMove", () => {
  it("accepts normal walking at the throttled update rate", () => {
    let track = start();
    let now = 0;
    for (let i = 1; i <= 20; i++) {
      now += 50;
      const result = checkMove(track, { x: 50 + i * 5, y: 50 }, now, ctx);
      expect(result.ok).toBe(true);
      track = result.track;
    }
    expect(track.x).toBe(150);
  });

  it("accepts diagonal walking, which is faster than the walk speed", () => {
    let track = start();
    let now = 0;
    for (let i = 1; i <= 20; i++) {
      now += 50;
      // 100px/s on both axes is about 141px/s along the path
      const result = checkMove(track, { x: 50 + i * 5, y: 50 + i * 5 }, now, ctx);
      expect(result.ok).toBe(true);
      track = result.track;
    }
  });

  it("accepts a burst of updates after a lag spike", () => {
    let track = start();
    // the client walked for one second, but all 20 updates arrive at once
    for (let i = 1; i <= 20; i++) {
      const result = checkMove(track, { x: 50 - i * 2, y: 50 }, 1000, ctx);
      expect(result.ok).toBe(true);
      track = result.track;
    }
  });

  it("rejects a speed hack and keeps the last valid position", () => {
    const result = checkMove(start(), { x: 50 + 250, y: 50 }, 50, ctx);
    expect(result).toMatchObject({ ok: false, reason: "too-far" });
    expect(result.track).toMatchObject({ x: 50, y: 50 });
  });

  it("rejects a sustained 3x speed hack", () => {
    let track = start();
    let rejected = 0;
    for (let i = 1; i <= 60; i++) {
      const result = checkMove(track, { x: track.x - 15, y: track.y }, i * 50, ctx);
      if (!result.ok) rejected++;
      track = result.track;
    }
    expect(rejected).toBeGreaterThan(20);
  });

  it("does not let a long idle bank unlimited distance", () => {
    const result = checkMove(start(), { x: 50, y: 300 }, 3_600_000, ctx);
    expect(result).toMatchObject({ ok: false, reason: "too-far" });
  });

  it("rejects stepping into a wall", () => {
    const track = startMoveTrack("town", 150, 50, 0, 100);
    const result = checkMove(track, { x: 168, y: 50 }, 500, ctx);
    expect(result).toMatchObject({ ok: false, reason: "in-wall" });
  });

  it("rejects crossing a wall in one jump", () => {
    const track = startMoveTrack("town", 130, 50, 0, 100);
    const result = checkMove(track, { x: 200, y: 50 }, 1000, ctx);
    expect(result).toMatchObject({ ok: false, reason: "in-wall" });
  });

  it("allows walking through the gap in the wall", () => {
    const track = startMoveTrack("town", 140, 296, 0, 100);
    const result = checkMove(track, { x: 190, y: 296 }, 1000, ctx);
    expect(result.ok).toBe(true);
  });

  it("allows a player already inside a wall to walk out", () => {
    const track = startMoveTrack("town", 176, 50, 0, 100);
    expect(checkMove(track, { x: 190, y: 50 }, 500, ctx).ok).toBe(true);
  });

  it("rejects positions outside the map and non-finite numbers", () => {
    const track = startMoveTrack("town", 10, 10, 0, 100);
    expect(checkMove(track, { x: -5, y: 10 }, 500, ctx)).toMatchObject({
      ok: false,
      reason: "out-of-bounds",
    });
    expect(checkMove(track, { x: 10, y: 321 }, 500, ctx)).toMatchObject({
      ok: false,
      reason: "out-of-bounds",
    });
    expect(checkMove(track, { x: Infinity, y: 10 }, 500, ctx)).toMatchObject({
      ok: false,
      reason: "invalid",
    });
  });

  it("uses the walk speed, so a faster player may move further", () => {
    const fast = { ...ctx, walkSpeed: 300 };
    const track = startMoveTrack("town", 50, 50, 0, 300);
    expect(checkMove(track, { x: 50, y: 50 + 120 }, 500, fast).ok).toBe(true);
    expect(checkMove(start(), { x: 50, y: 50 + 250 }, 500, ctx)).toMatchObject({ ok: false });
  });
});

describe("isWithinDoorRange", () => {
  const door = { x: 100, y: 100, width: 32, height: 32 };
  it("accepts a player on or near the door", () => {
    expect(isWithinDoorRange({ x: 110, y: 110, bodyOffsetY: 0 }, door)).toBe(true);
    expect(isWithinDoorRange({ x: 132 + DOOR_USE_RANGE - 1, y: 110, bodyOffsetY: 0 }, door)).toBe(
      true,
    );
  });
  it("rejects a player far from the door", () => {
    expect(isWithinDoorRange({ x: 500, y: 500, bodyOffsetY: 0 }, door)).toBe(false);
  });
});
