import { describe, expect, it } from "vitest";
import { stepHeroPosition, stepHeroThroughMap } from "./hero-motion";
import { checkMove, startMoveTrack } from "@/rules/movement/move-validation";
import type { TileGrid, TileMap } from "@/rules/movement/tilemap";

/* 10x10 tiles of 16px, with a wall column at tile x = 5. */
const grid: TileGrid = {
  width: 10,
  height: 10,
  tileWidth: 16,
  tileHeight: 16,
  solid: Array.from({ length: 10 }, () => Array.from({ length: 10 }, (_, x) => x === 5)),
};
const bounds = { width: 160, height: 160 };

describe("stepHeroPosition", () => {
  it("integrates velocity in open space", () => {
    const r = stepHeroPosition(grid, bounds, { x: 20, y: 20, vx: 0, vy: 60, bodySize: 4 }, 1);
    expect(r.x).toBeCloseTo(20);
    expect(r.y).toBeCloseTo(80);
    expect(r.blockedY).toBe(false);
  });

  it("stops flush against a wall", () => {
    const r = stepHeroPosition(grid, bounds, { x: 40, y: 40, vx: 100, vy: 0, bodySize: 6 }, 1);
    expect(r.x).toBeCloseTo(80 - 6);
    expect(r.blockedX).toBe(true);
  });

  it("stays inside the map", () => {
    const r = stepHeroPosition(grid, bounds, { x: 20, y: 20, vx: -200, vy: 0, bodySize: 6 }, 1);
    expect(r.x).toBe(6);
  });

  it("produces moves the server accepts", () => {
    const ctx = { grid, bounds, walkSpeed: 100, bodySize: 6 };
    let track = startMoveTrack("r", 40, 40, 0, 100);
    let hero = { x: 40, y: 40, vx: 100, vy: 30, bodySize: 6 };
    for (let i = 1; i <= 20; i++) {
      const next = stepHeroPosition(grid, bounds, hero, 0.05);
      hero = { ...hero, x: next.x, y: next.y };
      const result = checkMove(track, hero, i * 50, ctx);
      expect(result.ok).toBe(true);
      track = result.track;
    }
  });
});

describe("stepHeroThroughMap", () => {
  const map: TileMap = { grid, widthInPixels: 160, heightInPixels: 160, objects: {} };

  it("matches stepHeroPosition with the map's size as bounds", () => {
    const hero = { x: 40, y: 40, vx: 100, vy: 50, bodySize: 6 };
    expect(stepHeroThroughMap(map, hero, 0.5)).toEqual(stepHeroPosition(grid, bounds, hero, 0.5));
  });

  it("slides along a wall on the free axis", () => {
    const r = stepHeroThroughMap(map, { x: 70, y: 40, vx: 100, vy: 60, bodySize: 6 }, 0.5);
    expect(r.x).toBeCloseTo(80 - 6);
    expect(r.blockedX).toBe(true);
    expect(r.y).toBeCloseTo(70);
    expect(r.blockedY).toBe(false);
  });

  it("stops at the bottom edge of the map", () => {
    const r = stepHeroThroughMap(map, { x: 20, y: 150, vx: 0, vy: 100, bodySize: 6 }, 1);
    expect(r.y).toBe(160 - 6);
    expect(r.blockedY).toBe(true);
  });
});
