import { readFileSync } from "node:fs";
import { readMapWithTilesets } from "@/rules/movement";
import { describe, expect, it } from "vitest";
import { blankGrid, setTerrain } from "./map-terrain";
import { buildTiledMap, type TiledMap } from "./map-tiled";

/* With its shared tileset files put back in, as the game and the lab read it */
const template = readMapWithTilesets<TiledMap>("public/assets/tilemaps/meadow.json", (path) =>
  JSON.parse(readFileSync(path, "utf8")),
);

describe("buildTiledMap", () => {
  const grid = setTerrain(setTerrain(blankGrid(5, 4), 0, 0, "w"), 1, 0, "w");
  const map = buildTiledMap(grid, template);

  it("sizes the map one smaller than the corner grid", () => {
    expect([map.width, map.height]).toEqual([4, 3]);
  });

  it("keeps the game's layer names so the client loads it", () => {
    expect(map.layers.map(({ name }) => name)).toEqual([
      "Ground",
      "Shadows",
      "Overlay",
      "Extras",
      "Above",
      "Collide",
      "Loots",
      "Signs",
      "Doors",
      "Npcs",
    ]);
  });

  it("tiles plain grass with the grass tile and blocks the water", () => {
    const data = (layer: string) => {
      const found = map.layers.find(({ name }) => name === layer);
      return found && "data" in found ? found.data : [];
    };
    expect(data("Ground").at(-1)).toBe(98);
    expect(data("Collide")[0]).toBe(3106);
    expect(data("Collide").at(-1)).toBe(0);
  });
});
