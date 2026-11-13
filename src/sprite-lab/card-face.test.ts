import { describe, expect, it } from "vitest";
import { CARD_FRAMES, formatFaceScale, getFaceCrops, isInDiamond } from "./card-face";

describe("isInDiamond", () => {
  it("fills the middle and leaves the corners clear", () => {
    expect(isInDiamond(12, 12, 24)).toBe(true);
    expect(isInDiamond(0, 0, 24)).toBe(false);
    expect(isInDiamond(23, 23, 24)).toBe(false);
  });

  it("reaches the middle of every side", () => {
    expect(isInDiamond(11, 0, 24)).toBe(true);
    expect(isInDiamond(0, 12, 24)).toBe(true);
    expect(isInDiamond(23, 11, 24)).toBe(true);
    expect(isInDiamond(12, 23, 24)).toBe(true);
  });

  it("is symmetric", () => {
    for (let x = 0; x < 16; x += 1) {
      expect(isInDiamond(x, 3, 16)).toBe(isInDiamond(15 - x, 3, 16));
    }
  });
});

describe("getFaceCrops", () => {
  it("keeps only crops that scale to the window evenly and fit the frame", () => {
    expect(getFaceCrops(50)).toEqual([13, 26]);
    expect(getFaceCrops(80)).toEqual([13, 26, 52, 78]);
  });

  it("names each crop by its zoom", () => {
    expect([13, 26, 52].map(formatFaceScale)).toEqual(["2x", "1x", "1/2x"]);
  });
});

describe("CARD_FRAMES", () => {
  it("borders each card in its rarity's theme colour, over a dim glow fading to dark", () => {
    expect(CARD_FRAMES.common).toEqual({
      border: "#fff",
      corner: "#ffffff",
      glow: "#8c8c8c",
      shade: "#0d0d0d",
    });
    expect(CARD_FRAMES.unique.border).toBe("#ff8000");
  });
});
