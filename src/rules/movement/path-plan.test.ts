import { describe, expect, it } from "vitest";
import { buildTileGrid, createPathfinder, type TiledMapJson } from ".";
import { PATH_REPLAN_MS, PATH_RETRY_MS, planNextWaypoint } from "./path-plan";

/** 6x4 map of 32px tiles; column 3 is a wall except where `gap` leaves it open. */
const mapWith = (gap: boolean): TiledMapJson => ({
  width: 6,
  height: 4,
  tilewidth: 32,
  tileheight: 32,
  tilesets: [{ firstgid: 1, tiles: [{ id: 1, properties: [{ name: "collides", value: true }] }] }],
  layers: [
    {
      name: "Collide",
      type: "tilelayer",
      data: [0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, gap ? 0 : 2, 0, 0],
    },
  ],
});
const pathfinderFor = (gap: boolean) => createPathfinder(buildTileGrid(mapWith(gap)));

describe("planNextWaypoint", () => {
  const from = { x: 16, y: 16 };
  const to = { x: 176, y: 16 };

  it("reuses a fresh path instead of searching again", () => {
    const pf = pathfinderFor(true);
    const first = planNextWaypoint(pf, undefined, from, to, 0);
    expect(first.next).toBeDefined();
    const second = planNextWaypoint(pf, first.plan, from, to, PATH_REPLAN_MS - 1);
    expect(second.next).toEqual(first.next);
    expect(second.plan.plannedAt).toBe(0);
    const third = planNextWaypoint(pf, second.plan, from, to, PATH_REPLAN_MS);
    expect(third.plan.plannedAt).toBe(PATH_REPLAN_MS);
  });

  it("moves on to the next waypoint once standing in one", () => {
    const pf = pathfinderFor(true);
    const { next, plan } = planNextWaypoint(pf, undefined, from, to, 0);
    const after = planNextWaypoint(pf, plan, next!, to, 1);
    expect(after.next).toEqual(plan.waypoints![1]);
  });

  it("searches again early when the goal moves far", () => {
    const pf = pathfinderFor(true);
    const { plan } = planNextWaypoint(pf, undefined, from, to, 0);
    expect(planNextWaypoint(pf, plan, from, { x: 176, y: 112 }, 1).plan.plannedAt).toBe(1);
  });

  it("waits before retrying a goal it found no way to", () => {
    const pf = pathfinderFor(false);
    const first = planNextWaypoint(pf, undefined, from, to, 0);
    expect(first.next).toBeUndefined();
    const waiting = planNextWaypoint(pf, first.plan, from, to, PATH_RETRY_MS - 1);
    expect(waiting.plan.plannedAt).toBe(0);
    const retried = planNextWaypoint(pf, first.plan, from, to, PATH_RETRY_MS);
    expect(retried.plan.plannedAt).toBe(PATH_RETRY_MS);
  });
});
