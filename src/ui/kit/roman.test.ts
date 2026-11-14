import { describe, expect, it } from "vitest";
import { toRoman } from "./roman";

describe("toRoman", () => {
  it("writes ranks as numerals", () => {
    expect([1, 2, 3, 4, 5, 6, 9, 14, 40, 49].map(toRoman)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "IX",
      "XIV",
      "XL",
      "XLIX",
    ]);
  });

  it("leaves nothing to write as it is", () => {
    expect(toRoman(0)).toBe("0");
    expect(toRoman(undefined)).toBe("");
  });
});
