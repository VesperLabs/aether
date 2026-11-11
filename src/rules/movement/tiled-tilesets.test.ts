import { describe, expect, it } from "vitest";
import { inlineTilesets, readMapWithTilesets, tilesetPath, tilesetSources } from "./tiled-tilesets";

const map = {
  width: 1,
  tilesets: [
    { firstgid: 1, source: "../tilesets/extras.tsj" },
    { firstgid: 401, source: "../tilesets/collide.tsj" },
    { firstgid: 403, source: "../tilesets/collide.tsj" },
    { firstgid: 405, name: "embedded", image: "../tilesets/old.png" },
  ],
};

describe("shared tilesets", () => {
  it("finds each tileset file next to the map's folder, once", () => {
    expect(tilesetPath("assets/tilemaps/town.json", "../tilesets/extras.tsj")).toBe(
      "assets/tilesets/extras.tsj",
    );
    expect(tilesetPath("https://cdn.example/a/tilemaps/t.json", "../tilesets/x.tsj")).toBe(
      "https://cdn.example/a/tilesets/x.tsj",
    );
    expect(tilesetSources(map, "./assets/tilemaps/town.json")).toEqual([
      "assets/tilesets/extras.tsj",
      "assets/tilesets/collide.tsj",
    ]);
  });

  it("puts each file back in the map at its own first id, with the image path from the map", () => {
    const files = {
      "assets/tilesets/extras.tsj": { name: "tileset-extras", image: "extras.png", tiles: [] },
      "assets/tilesets/collide.tsj": { name: "tileset-collide", image: "collide.png" },
    };
    const inlined = inlineTilesets(map, "assets/tilemaps/town.json", files);
    expect(inlined.width).toBe(1);
    expect(inlined.tilesets).toEqual([
      { name: "tileset-extras", image: "../tilesets/extras.png", tiles: [], firstgid: 1 },
      { name: "tileset-collide", image: "../tilesets/collide.png", firstgid: 401 },
      { name: "tileset-collide", image: "../tilesets/collide.png", firstgid: 403 },
      { firstgid: 405, name: "embedded", image: "../tilesets/old.png" },
    ]);
  });

  it("fails loudly when a tileset file wasn't loaded", () => {
    expect(() => inlineTilesets(map, "assets/tilemaps/town.json", {})).toThrow(/extras\.tsj/);
  });

  it("reads a map and its tileset files through one reader", () => {
    const files: Record<string, unknown> = {
      "/maps/a.json": { tilesets: [{ firstgid: 1, source: "../sets/s.tsj" }] },
      "/sets/s.tsj": { name: "s", image: "s.png" },
    };
    const map = readMapWithTilesets<{ tilesets: { firstgid: number }[] }>(
      "/maps/a.json",
      (path) => files[path],
    );
    expect(map.tilesets).toEqual([{ name: "s", image: "../sets/s.png", firstgid: 1 }]);
  });
});
