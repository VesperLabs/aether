import { describe, expect, it } from "vitest";
import { buildTileGrid, isOutOfMap, readTileMap, type TiledMapJson } from "./tilemap";
import {
  WATER_SPEED_SCALE,
  habitatMap,
  isOutOfHabitat,
  nearestWater,
  terrainSpeedScale,
} from "./terrain";

/* One row: land, water, wall. Tile 1 is a wall, tile 2 is water, like the collide tileset. */
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
        { id: 2, properties: [{ name: "water", value: true }] },
      ],
    },
  ],
  layers: [{ name: "Collide", type: "tilelayer", data: [0, 3, 2] }],
};
const map = readTileMap(json);
const land = { x: 16, y: 16 };
const water = { x: 48, y: 16 };

describe("water tiles", () => {
  it("are walkable, unlike walls", () => {
    const grid = buildTileGrid(json);
    expect(grid.solid[0]).toEqual([false, false, true]);
    expect(grid.water[0]).toEqual([false, true, false]);
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
