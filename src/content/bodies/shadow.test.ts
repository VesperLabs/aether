import { describe, expect, it } from "vitest";
import { shadowOf, shadowPixels } from "./shadow";

const land = { hitBox: { width: 18, height: 46 }, habitat: "land" as const };

describe("shadowOf", () => {
  it("is half again as wide as the hit box and half as tall", () => {
    expect(shadowOf(land)).toMatchObject({ width: 27, height: 14 });
  });

  it("is smaller and fainter under a flier", () => {
    const air = shadowOf({ ...land, habitat: "air" });
    expect(air.width).toBeLessThan(27);
    expect(air.opacity).toBeLessThan(shadowOf(land).opacity);
    expect(air.below).toBeGreaterThan(shadowOf(land).below);
  });

  it("takes the body's own width when it sets one", () => {
    expect(shadowOf({ ...land, shadowWidth: 10 }).width).toBe(10);
  });
});

describe("shadowPixels", () => {
  it("is darkest in the middle and clear at the corners", () => {
    const shape = shadowOf(land);
    const pixels = shadowPixels(shape);
    const alphaAt = (x: number, y: number) => pixels[(y * shape.width + x) * 4 + 3];
    expect(alphaAt(13, 7)).toBe(Math.round(255 * shape.opacity));
    expect(alphaAt(0, 0)).toBe(0);
  });
});
