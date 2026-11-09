import { describe, expect, it } from "vitest";
import { sectorOverlapsBox, sectorOverlapsCircle, type Sector } from "./sector";

/** A quarter wedge from the origin, pointing down-right (0° to 90°), 20px long. */
const wedge: Sector = { x: 0, y: 0, radius: 20, from: 0, span: 90 };
const box = (x: number, y: number, half = 2) => ({ x, y, halfWidth: half, halfHeight: half });

describe("sectorOverlapsBox", () => {
  it("hits a box inside the wedge", () => {
    expect(sectorOverlapsBox(wedge, box(8, 8))).toBe(true);
  });
  it("misses a box outside its angles", () => {
    expect(sectorOverlapsBox(wedge, box(-10, -10))).toBe(false);
  });
  it("misses a box past its reach", () => {
    expect(sectorOverlapsBox(wedge, box(30, 30))).toBe(false);
  });
  it("hits a box the wedge only clips with its edge", () => {
    /* Centred just above the 0° edge, its bottom dips below it */
    expect(sectorOverlapsBox(wedge, box(10, -1))).toBe(true);
  });
  it("hits a big box the wedge sits inside", () => {
    expect(sectorOverlapsBox(wedge, box(0, 0, 50))).toBe(true);
  });
  it("handles a wedge that wraps past 360°", () => {
    const wrapping: Sector = { ...wedge, from: 315, span: 90 };
    expect(sectorOverlapsBox(wrapping, box(10, -3))).toBe(true);
    expect(sectorOverlapsBox(wrapping, box(-10, 0))).toBe(false);
  });
  it("is just a line when nothing is swept yet", () => {
    const line: Sector = { ...wedge, span: 0 };
    expect(sectorOverlapsBox(line, box(10, 0))).toBe(true);
    expect(sectorOverlapsBox(line, box(0, 10))).toBe(false);
  });
});

describe("sectorOverlapsCircle", () => {
  it("hits a circle inside the wedge", () => {
    expect(sectorOverlapsCircle(wedge, { x: 10, y: 10, radius: 2 })).toBe(true);
  });
  it("hits a circle overlapping an edge from outside", () => {
    expect(sectorOverlapsCircle(wedge, { x: 10, y: -2, radius: 3 })).toBe(true);
  });
  it("misses a circle behind it", () => {
    expect(sectorOverlapsCircle(wedge, { x: -10, y: -10, radius: 3 })).toBe(false);
  });
});
