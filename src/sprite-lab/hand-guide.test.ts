import { describe, expect, it } from "vitest";
import { findHands } from "./hand-guide";

const CELL = 20;

/** A frame with a 3x3 clump around each point. */
const withClumps = (...points: [number, number][]) => {
  const data = new Uint8ClampedArray(CELL * CELL * 4);
  points.forEach(([cx, cy]) => {
    for (let y = cy - 1; y <= cy + 1; y += 1) {
      for (let x = cx - 1; x <= cx + 1; x += 1) data[(y * CELL + x) * 4 + 3] = 255;
    }
  });
  return data;
};

const labels = (data: Uint8ClampedArray, column: number, row: number) =>
  findHands(data, CELL, { column, row }).map(({ x, label }) => [x, label]);

describe("hand guide", () => {
  it("names front hands from the character's side, and back hands as seen", () => {
    const hands = withClumps([4, 10], [15, 10]);
    expect(labels(hands, 0, 2)).toEqual([
      [4, "RIGHT hand"],
      [15, "LEFT hand"],
    ]);
    expect(labels(hands, 0, 0)).toEqual([
      [4, "LEFT hand"],
      [15, "RIGHT hand"],
    ]);
  });

  it("calls a lone walking hand near", () => {
    expect(labels(withClumps([9, 10]), 1, 1)).toEqual([[9, "NEAR hand"]]);
  });

  it("puts the attacking hand forward, near or far by which hand it is", () => {
    const hands = withClumps([4, 10], [15, 10]);
    expect(labels(hands, 4, 1)).toEqual([
      [15, "NEAR hand"],
      [4, "FAR hand"],
    ]);
    expect(labels(hands, 5, 1)).toEqual([
      [15, "FAR hand"],
      [4, "NEAR hand"],
    ]);
    expect(labels(hands, 5, 3)).toEqual([
      [4, "NEAR hand"],
      [15, "FAR hand"],
    ]);
  });

  it("ignores stray pixels", () => {
    const data = new Uint8ClampedArray(CELL * CELL * 4);
    data[3] = 255;
    expect(findHands(data, CELL, { column: 0, row: 2 })).toEqual([]);
  });
});
