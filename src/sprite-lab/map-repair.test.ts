import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blankGrid, setTerrain, type WangSet } from "./map-terrain";
import { createRepair } from "./map-repair";
import { getTerrainWangset, type TiledMap } from "./map-tiled";

const template: TiledMap = JSON.parse(readFileSync("public/assets/tilemaps/meadow.json", "utf8"));
const wangset: WangSet = getTerrainWangset(template);
const repair = createRepair(wangset);

const known = new Set(
  wangset.wangtiles.map(({ wangid }) => [7, 1, 3, 5].map((index) => wangid[index]).join()),
);
const COLORS: Record<string, number> = { d: 1, g: 2, w: 3, s: 4 };

const invalidTiles = (grid: string[]) => {
  const bad: string[] = [];
  for (let y = 0; y < grid.length - 1; y++) {
    for (let x = 0; x < grid[0].length - 1; x++) {
      const corners = [grid[y][x], grid[y][x + 1], grid[y + 1][x + 1], grid[y + 1][x]];
      if (!known.has(corners.map((letter) => COLORS[letter]).join())) bad.push(`${x},${y}`);
    }
  }
  return bad;
};

describe("createRepair", () => {
  it("leaves grids the tileset can already draw alone", () => {
    const grid = setTerrain(blankGrid(6, 6), 2, 2, "w");
    expect(repair(grid)).toEqual(grid);
  });

  it("puts grass between dark grass and water", () => {
    let grid = blankGrid(6, 6);
    grid = setTerrain(grid, 2, 2, "d");
    grid = setTerrain(grid, 3, 2, "w");
    const locked = new Set(["3,2"]);
    const repaired = repair(grid, locked);
    expect(invalidTiles(repaired)).toEqual([]);
    expect(repaired[2][3]).toBe("w");
  });

  it("fixes checkerboard diagonals", () => {
    let grid = blankGrid(6, 6);
    grid = setTerrain(grid, 2, 2, "s");
    grid = setTerrain(grid, 3, 3, "s");
    expect(invalidTiles(repair(grid))).toEqual([]);
  });

  it("cleans up a messy painted patch", () => {
    const grid = ["gggggggg", "gdwsdwgg", "gswdswdg", "gdwsdwsg", "gggggggg", "gggggggg"];
    expect(invalidTiles(repair(grid))).toEqual([]);
  });
});
