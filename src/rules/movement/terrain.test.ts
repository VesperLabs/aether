import { describe, expect, it } from "vitest";
import { buildTileGrid, isOnIce, isOutOfMap, readTileMap, type TiledMapJson } from "./tilemap";
import { readTerrainQuarters } from "./terrain-corners";
import {
  WATER_SPEED_SCALE,
  habitatMap,
  isOutOfHabitat,
  nearestWater,
  terrainSpeedScale,
} from "./terrain";

/*
 * One row: land, water, wall. Walls are tile 1 on the collide layer; water is painted on the ground
 * with a corner terrain tile (tile 3) whose four corners are Water, as Tiled's terrain set writes it.
 */
const WATER_CORNERS = [0, 1, 0, 1, 0, 1, 0, 1];
const json: TiledMapJson = {
  width: 3,
  height: 1,
  tilewidth: 32,
  tileheight: 32,
  tilesets: [
    {
      firstgid: 1,
      tiles: [
        { id: 1, properties: [{ name: "collides", value: true }] },
        { id: 8, properties: [{ name: "bridge", value: true }] },
      ],
      wangsets: [
        {
          name: "Terrains",
          colors: [{ name: "Water" }],
          wangtiles: [
            { tileid: 3, wangid: WATER_CORNERS },
            { tileid: 4, wangid: [0, 1, 0, 0, 0, 0, 0, 1] },
          ],
        },
      ],
    },
  ],
  layers: [
    { name: "Ground", type: "tilelayer", data: [0, 4, 0] },
    { name: "Collide", type: "tilelayer", data: [0, 0, 2] },
  ],
};
/* Tile 4 is all water; tile 5 is a shore, water only on its top corners; tile 9 is a bridge; tile 10 has no terrain, like a rock. */
const map = readTileMap(json);
const land = { x: 16, y: 16 };
const water = { x: 48, y: 16 };

describe("water tiles", () => {
  it("are walkable, unlike walls", () => {
    const grid = buildTileGrid(json);
    expect(grid.solid[0]).toEqual([false, false, true]);
    expect(grid.water[0]).toEqual([false, true, false]);
  });

  it("are whole tiles: a shore tile, water on only some corners, is dry", () => {
    const shore = { ...json, layers: [{ name: "Ground", type: "tilelayer", data: [0, 5, 0] }] };
    expect(buildTileGrid(shore).water[0]).toEqual([false, false, false]);
    const W = "Water";
    const _ = undefined;
    expect(readTerrainQuarters(shore)).toEqual([
      [_, _, W, W, _, _],
      [_, _, _, _, _, _],
    ]);
  });

  it("show through decorations, but are dry under a bridge", () => {
    const rock = {
      ...json,
      layers: [
        { name: "Ground", type: "tilelayer", data: [0, 4, 0] },
        { name: "Overlay", type: "tilelayer", data: [0, 10, 0] },
      ],
    };
    expect(buildTileGrid(rock).water[0]).toEqual([false, true, false]);
    const bridged = {
      ...json,
      layers: [
        { name: "Ground", type: "tilelayer", data: [0, 4, 0] },
        { name: "Overlay", type: "tilelayer", data: [0, 9, 0] },
      ],
    };
    expect(buildTileGrid(bridged).water[0]).toEqual([false, false, false]);
  });

  it("slow walkers but not swimmers", () => {
    expect(terrainSpeedScale(map.grid, water)).toBe(WATER_SPEED_SCALE);
    expect(terrainSpeedScale(map.grid, water, "water")).toBe(1);
    expect(terrainSpeedScale(map.grid, land)).toBe(1);
  });
});

describe("habitatMap", () => {
  it("lets a walker into the water", () => {
    expect(isOutOfMap(habitatMap(map, land), water.x, water.y)).toBe(false);
  });

  it("keeps a swimmer in the water off the land", () => {
    expect(isOutOfMap(habitatMap(map, water, "water"), land.x, land.y)).toBe(true);
  });

  it("lets a swimmer on the bank move, and sends it home", () => {
    expect(isOutOfMap(habitatMap(map, land, "water"), water.x, water.y)).toBe(false);
    expect(isOutOfHabitat(map, land, "water")).toBe(true);
    expect(isOutOfHabitat(map, water, "water")).toBe(false);
    expect(isOutOfHabitat(map, water)).toBe(false);
  });
});

describe("nearestWater", () => {
  it("finds the middle of the closest water tile", () => {
    expect(nearestWater(map.grid, land)).toEqual(water);
  });
});

describe("ice tiles", () => {
  it("are slippery a quarter tile at a time, so edges are icy only on their ice side", () => {
    const icy: TiledMapJson = {
      ...json,
      tilesets: [
        {
          firstgid: 1,
          wangsets: [
            {
              name: "Terrains",
              colors: [{ name: "Ice" }],
              wangtiles: [
                { tileid: 3, wangid: WATER_CORNERS },
                { tileid: 4, wangid: [0, 1, 0, 0, 0, 0, 0, 1] },
              ],
            },
          ],
        },
      ],
      layers: [{ name: "Ground", type: "tilelayer", data: [4, 5, 0] }],
    };
    const grid = buildTileGrid(icy);
    expect(grid.ice?.[0]).toEqual([true, true, true, true, false, false]);
    expect(grid.ice?.[1]).toEqual([true, true, false, false, false, false]);
    expect(isOnIce(grid, 16, 16)).toBe(true);
    expect(isOnIce(grid, 48, 8)).toBe(true);
    expect(isOnIce(grid, 48, 24)).toBe(false);
    expect(isOnIce(grid, 80, 8)).toBe(false);
  });
});
