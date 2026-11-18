import { describe, expect, it } from "vitest";
import { readTileMap, type TiledMapJson } from "./tilemap";
import { bodyFits, findOpenSpot } from "./open-spot";

/* 7x5 of 16px tiles: a one-tile corridor along row 2, open below it */
const rows = ["#######", "#######", "..&....", ".......", "......."];
const json: TiledMapJson = {
  width: 7,
  height: 5,
  tilewidth: 16,
  tileheight: 16,
  tilesets: [{ firstgid: 1, tiles: [{ id: 1, properties: [{ name: "collides", value: true }] }] }],
  layers: [
    {
      name: "Collide",
      type: "tilelayer",
      data: rows.flatMap((row) => [...row].map((c) => (c === "#" ? 2 : 0))),
    },
  ],
};
const map = readTileMap(json);

describe("findOpenSpot", () => {
  it("keeps the spot when the body fits there", () => {
    expect(findOpenSpot(map, { x: 40, y: 40 }, 6)).toEqual({ x: 40, y: 40 });
  });

  it("moves a wide body out of a corridor it can't fit in, to the nearest open ground", () => {
    const spot = findOpenSpot(map, { x: 40, y: 40 }, 16);
    expect(bodyFits(map, spot.x, spot.y, 16)).toBe(true);
    expect(spot.y).toBeGreaterThan(40);
  });
});
