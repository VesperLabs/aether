import { describe, expect, it } from "vitest";
import {
  autotile,
  blankGrid,
  blockedTiles,
  normalizeGrid,
  setTerrain,
  type WangSet,
} from "./map-terrain";

/** Corner colors in wangid order are at indexes 7 (TL), 1 (TR), 3 (BR), 5 (BL). */
const tile = (tileid: number, [tl, tr, br, bl]: number[]) => ({
  tileid,
  wangid: [0, tr, 0, br, 0, bl, 0, tl],
});

const WANGSET: WangSet = {
  type: "corner",
  wangtiles: [
    tile(10, [2, 2, 2, 2]),
    tile(11, [2, 2, 2, 2]),
    tile(20, [3, 3, 3, 3]),
    tile(30, [2, 2, 3, 3]),
  ],
};

describe("normalizeGrid", () => {
  it("pads, trims and replaces unknown letters with grass", () => {
    expect(normalizeGrid(["wwwx", "w?"], 3, 3)).toEqual(["www", "wgg", "ggg"]);
  });
});

describe("autotile", () => {
  it("makes one tile per cell between corners", () => {
    const tiles = autotile(blankGrid(4, 3), WANGSET);
    expect(tiles).toHaveLength(3 * 2);
    expect(tiles.every((id) => id === 10 || id === 11)).toBe(true);
  });

  it("uses the tile whose corners match exactly", () => {
    expect(autotile(["gg", "ww"], WANGSET)).toEqual([30]);
    expect(autotile(["ww", "ww"], WANGSET)).toEqual([20]);
  });

  it("falls back to the closest tile for corner mixes the tileset lacks", () => {
    expect(autotile(["gw", "ww"], WANGSET)).toEqual([20]);
  });

  it("picks the same variant for the same spot every time", () => {
    const grid = blankGrid(6, 6);
    expect(autotile(grid, WANGSET)).toEqual(autotile(grid, WANGSET));
  });
});

describe("blockedTiles", () => {
  it("blocks tiles that are at least half water", () => {
    const grid = setTerrain(setTerrain(blankGrid(3, 2), 0, 0, "w"), 1, 0, "w");
    expect(blockedTiles(grid)).toEqual([true, false]);
  });
});
