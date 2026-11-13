import { describe, expect, it } from "vitest";
import { isInDiamond } from "./card-face";

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
