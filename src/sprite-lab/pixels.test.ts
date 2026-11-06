import { describe, expect, it } from "vitest";
import {
  getPalette,
  matchHeight,
  matchShading,
  removeBody,
  snapToPalette,
  toCell,
  type Pixels,
} from "./pixels";

const MAGENTA = [255, 0, 255, 255];
const WHITE = [255, 255, 255, 255];

/** A square of pixels, painted by `paint`. */
const image = (size: number, paint: (x: number, y: number) => number[]): Pixels => {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) data.set(paint(x, y), (y * size + x) * 4);
  }
  return { data, width: size, height: size };
};

const alphaAt = ({ data, width }: Pixels, x: number, y: number) => data[(y * width + x) * 4 + 3];

describe("pixels", () => {
  it("collects each visible colour once", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 255, 1, 2, 3, 255, 9, 9, 9, 0]);
    expect(getPalette(data)).toEqual([[1, 2, 3]]);
  });

  it("brings a brightened drawing back to the shades of the reference", () => {
    const palette = [
      [40, 40, 40],
      [80, 80, 80],
      [120, 120, 120],
    ];
    const reference = new Uint8ClampedArray(palette.flatMap((color) => [...color, 255]));
    const data = new Uint8ClampedArray([70, 70, 70, 255, 110, 110, 110, 255, 150, 150, 150, 255]);
    matchShading(data, reference);
    snapToPalette(data, palette);
    expect([...data]).toEqual([...reference]);
  });

  it("leaves shading alone when the reference is empty, and clear pixels always", () => {
    const data = new Uint8ClampedArray([70, 70, 70, 255, 9, 9, 9, 0]);
    matchShading(data, new Uint8ClampedArray([0, 0, 0, 0]));
    expect([...data]).toEqual([70, 70, 70, 255, 9, 9, 9, 0]);
    matchShading(data, new Uint8ClampedArray([60, 60, 60, 255]));
    expect([...data]).toEqual([60, 60, 60, 255, 9, 9, 9, 0]);
  });

  it("snaps visible pixels to the palette and leaves clear ones", () => {
    const data = new Uint8ClampedArray([0, 0, 0, 0, 12, 12, 12, 200]);
    snapToPalette(data, [
      [0, 0, 0],
      [200, 0, 0],
    ]);
    expect([...data]).toEqual([0, 0, 0, 0, 0, 0, 0, 255]);
  });

  it("shrinks an image to a cell by block, clearing the magenta", () => {
    const cell = toCell(
      image(8, (x) => (x < 4 ? WHITE : MAGENTA)),
      2,
    );
    expect(alphaAt(cell, 0, 0)).toBe(255);
    expect(alphaAt(cell, 1, 0)).toBe(0);
  });

  it("keeps a block with only a sliver of art, so thin limbs survive", () => {
    const cell = toCell(
      image(8, (x) => (x === 0 ? WHITE : MAGENTA)),
      2,
    );
    expect(alphaAt(cell, 0, 0)).toBe(255);
    expect(alphaAt(cell, 1, 0)).toBe(0);
  });

  it("takes the body out of a dressed drawing, leaving the clothing", () => {
    const skin = [240, 200, 170, 255];
    const red = [200, 20, 20, 255];
    const clear = [0, 0, 0, 0];
    const body = image(6, (x) => (x < 4 ? skin : clear));
    const dressed = image(6, (x, y) => (y < 3 ? skin : red));
    const clothing = removeBody(dressed, body);
    expect(alphaAt(clothing, 0, 0)).toBe(0);
    expect(alphaAt(clothing, 5, 0)).toBe(255);
    expect(alphaAt(clothing, 0, 4)).toBe(255);
  });

  it("keeps a skin-coloured highlight inside the clothing", () => {
    const skin = [240, 200, 170, 255];
    const red = [200, 20, 20, 255];
    const inner = (x: number, y: number) => x > 1 && x < 8 && y > 1 && y < 8;
    const clothing = removeBody(
      image(10, (x, y) => (inner(x, y) ? skin : red)),
      image(10, () => skin),
    );
    expect(alphaAt(clothing, 4, 4)).toBe(255);
  });

  it("keeps a small highlight at the clothing's edge", () => {
    const skin = [240, 200, 170, 255];
    const red = [200, 20, 20, 255];
    const clothing = removeBody(
      image(10, (x, y) => (y === 0 && x < 3 ? skin : red)),
      image(10, () => skin),
    );
    expect(alphaAt(clothing, 1, 0)).toBe(255);
  });

  it("keeps a highlight that only matches the body somewhere else", () => {
    const light = [250, 240, 230, 255];
    const skin = [150, 100, 80, 255];
    const body = image(6, (x) => (x === 0 ? light : skin));
    const dressed = image(6, (x) => (x === 5 ? light : skin));
    const clothing = removeBody(dressed, body);
    expect(alphaAt(clothing, 5, 3)).toBe(255);
    expect(alphaAt(clothing, 3, 3)).toBe(0);
  });

  it("clears a body outline drawn a pixel off, but not clothing's own outline", () => {
    const clear = [0, 0, 0, 0];
    const black = [0, 0, 0, 255];
    const red = [200, 20, 20, 255];
    const body = image(9, (x) => (x === 4 ? [240, 200, 170, 255] : clear));
    const dressed = image(9, (x, y) => {
      if (x === 5 && y === 1) return black;
      if (y === 7 && x === 5) return black;
      if (y === 7 && x === 6) return red;
      return clear;
    });
    const clothing = removeBody(dressed, body);
    expect(alphaAt(clothing, 5, 1)).toBe(0);
    expect(alphaAt(clothing, 5, 7)).toBe(255);
  });

  it("lands a too-big drawing on the original's rows, keeping its width free", () => {
    const rect =
      (left: number, right: number, top: number, bottom: number, fill: number[]) =>
      (x: number, y: number) =>
        x >= left && x < right && y >= top && y < bottom ? WHITE : fill;
    const original = image(10, rect(4, 6, 3, 8, [0, 0, 0, 0]));
    const drawing = image(40, rect(4, 36, 0, 40, MAGENTA));
    const cell = toCell(matchHeight(drawing, original), 10);
    expect(alphaAt(cell, 5, 2)).toBe(0);
    expect(alphaAt(cell, 5, 3)).toBe(255);
    expect(alphaAt(cell, 5, 7)).toBe(255);
    expect(alphaAt(cell, 5, 8)).toBe(0);
    /* Wider than the original, as drawn: only the height was matched. */
    expect(alphaAt(cell, 3, 5)).toBe(255);
    expect(alphaAt(cell, 2, 5)).toBe(0);
  });
});
