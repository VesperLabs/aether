import { describe, expect, it } from "vitest";
import { hasLineOfSight } from "./line-of-sight";

const grid = {
  width: 3,
  height: 1,
  tileWidth: 16,
  tileHeight: 16,
  solid: [[false, true, false]],
};

describe("hasLineOfSight", () => {
  it("is blocked by a solid tile in between", () => {
    expect(hasLineOfSight(grid, { x: 8, y: 8 }, { x: 40, y: 8 })).toBe(false);
  });

  it("is clear within open ground", () => {
    expect(hasLineOfSight(grid, { x: 2, y: 8 }, { x: 14, y: 8 })).toBe(true);
  });
});
