import { describe, expect, it } from "vitest";
import {
  buildTileGrid,
  circleOverlapsBox,
  createPathfinder,
  findNextWaypoint,
  moveBodyThroughMap,
  moveBox,
  NPC_WALL_RADIUS,
  readTileMap,
  shapesOverlap,
  type TiledMapJson,
} from ".";

/** 4x4 map of 32px tiles with one wall at tile (2, 1). */
const map: TiledMapJson = {
  width: 4,
  height: 4,
  tilewidth: 32,
  tileheight: 32,
  tilesets: [{ firstgid: 1, tiles: [{ id: 1, properties: [{ name: "collides", value: true }] }] }],
  layers: [
    { name: "Collide", type: "tilelayer", data: [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
};
const grid = buildTileGrid(map);
const bounds = { width: 128, height: 128 };
const box = (x: number, y: number) => ({ x, y, halfWidth: 8, halfHeight: 8 });

describe("tile grid", () => {
  it("marks only tiles with the collides property as solid", () => {
    expect(grid.solid[1][2]).toBe(true);
    expect(grid.solid.flat().filter(Boolean)).toHaveLength(1);
  });
});

describe("moveBox", () => {
  it("moves freely in open space", () => {
    const r = moveBox(grid, bounds, box(20, 20), { x: 30, y: 0 }, 0.1);
    expect(r.x).toBeCloseTo(23);
    expect(r.blockedX).toBe(false);
  });
  it("stops flush against a wall", () => {
    const r = moveBox(grid, bounds, box(40, 48), { x: 100, y: 0 }, 1);
    expect(r.x).toBeCloseTo(56);
    expect(r.blockedX).toBe(true);
  });
  it("slides along a wall", () => {
    const r = moveBox(grid, bounds, box(40, 40), { x: 100, y: 100 }, 0.5);
    expect(r.blockedX).toBe(true);
    expect(r.y).toBeGreaterThan(40);
  });
  it("stays inside the map", () => {
    const r = moveBox(grid, bounds, box(10, 10), { x: -500, y: -500 }, 1);
    expect(r.x).toBe(8);
    expect(r.y).toBe(8);
  });
});

describe("moveBodyThroughMap", () => {
  it("stops an NPC at the fixed wall radius, whatever its body size", () => {
    const npc = { x: 40, y: 48, vx: 100, vy: 0, bodySize: 20 };
    moveBodyThroughMap(readTileMap(map), npc, 1);
    expect(npc.x).toBeCloseTo(64 - NPC_WALL_RADIUS);
  });
});

describe("overlap", () => {
  it("circle vs box", () => {
    expect(circleOverlapsBox({ x: 0, y: 0, radius: 5 }, box(12, 0))).toBe(true);
    expect(circleOverlapsBox({ x: 0, y: 0, radius: 3 }, box(12, 0))).toBe(false);
  });
  it("shapes of both kinds", () => {
    const c = { kind: "circle" as const, x: 0, y: 0, radius: 4 };
    expect(shapesOverlap(c, { kind: "circle", x: 7, y: 0, radius: 4 })).toBe(true);
    expect(shapesOverlap({ kind: "box", ...box(30, 0) }, c)).toBe(false);
  });
});

describe("pathfinding", () => {
  it("steps around a wall", () => {
    const pf = createPathfinder(grid);
    const next = findNextWaypoint(pf, { x: 48, y: 48 }, { x: 112, y: 48 });
    expect(next).toBeDefined();
    expect(next!.x).toBe(80);
    expect(next!.y).not.toBe(48);
  });
});
