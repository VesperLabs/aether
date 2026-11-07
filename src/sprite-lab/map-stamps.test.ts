import { describe, expect, it } from "vitest";
import { captureStamp, createGidMapper, placeStamps, placementAt, type Stamp } from "./map-stamps";

const source = {
  width: 3,
  tilesets: [
    { name: "ground", firstgid: 1 },
    { name: "extras", firstgid: 101 },
  ],
  layers: [
    { name: "Overlay", type: "tilelayer", data: [0, 5, 0, 0, 6, 0] },
    { name: "Extras", type: "tilelayer", data: [0, 0, 0, 0, 102, 0] },
    { name: "Above", type: "tilelayer", data: [0, 0, 0, 0, 0, 0] },
  ],
};
const template = {
  tilesets: [
    { name: "extras", firstgid: 1 },
    { name: "ground", firstgid: 11 },
  ],
};

describe("createGidMapper", () => {
  const map = createGidMapper(source.tilesets, template.tilesets);

  it("re-numbers tiles by tileset name", () => {
    expect(map(5)).toBe(15);
    expect(map(102)).toBe(2);
  });

  it("keeps flip bits and leaves empty tiles empty", () => {
    expect(map(0x80000005)).toBe(0x8000000f);
    expect(map(0)).toBe(0);
  });
});

describe("captureStamp", () => {
  it("cuts every used layer out of the source, re-numbered", () => {
    const stamp = captureStamp(source, template, { x: 1, y: 0, width: 1, height: 2 }, "post", "");
    expect(stamp.layers).toEqual({ Overlay: [15, 16], Extras: [0, 2] });
  });
});

describe("placeStamps", () => {
  const tree: Stamp = {
    id: "tree",
    description: "",
    width: 1,
    height: 2,
    layers: { Above: [7, 0], Overlay: [0, 8], Collide: [0, 9] },
  };

  it("writes each layer at the placement and skips tiles past the edge", () => {
    const layers = placeStamps(2, 2, [{ id: "tree", x: 1, y: 1 }], [tree]);
    expect(layers.Above).toEqual([0, 0, 0, 7]);
    expect(layers.Overlay).toEqual([0, 0, 0, 0]);
  });

  it("draws the stamp lower on the map over the one behind it", () => {
    const layers = placeStamps(
      1,
      3,
      [
        { id: "tree", x: 0, y: 1 },
        { id: "tree", x: 0, y: 0 },
      ],
      [tree],
    );
    expect(layers.Above).toEqual([7, 7, 0]);
    expect(layers.Overlay).toEqual([0, 8, 8]);
  });

  it("finds the placement under a tile", () => {
    const placements = [{ id: "tree", x: 0, y: 0 }];
    expect(placementAt(placements, [tree], 0, 1)).toBe(0);
    expect(placementAt(placements, [tree], 1, 1)).toBe(-1);
  });
});
