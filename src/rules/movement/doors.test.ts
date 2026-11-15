import { describe, expect, it } from "vitest";
import { doorArrival } from "./doors";

const door = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
  centerPos: { x: x + width / 2, y: y + height / 2 },
});

describe("doorArrival", () => {
  it("keeps the spot along a wide door", () => {
    expect(doorArrival({ x: 110, y: 0 }, door(100, 0, 64, 16), door(500, 300, 64, 16))).toEqual({
      x: 510,
      y: 308,
    });
  });

  it("keeps the spot along a tall door", () => {
    expect(doorArrival({ x: 0, y: 48 }, door(0, 0, 16, 64), door(200, 100, 16, 32))).toEqual({
      x: 208,
      y: 124,
    });
  });

  it("clamps a player standing past the door's end", () => {
    expect(doorArrival({ x: 0, y: 0 }, door(100, 0, 64, 16), door(500, 300, 64, 16)).x).toBe(500);
  });
});
