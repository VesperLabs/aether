import { describe, expect, it } from "vitest";
import { toTint } from "./tint";

describe("toTint", () => {
  it("converts hex strings and numbers", () => {
    expect(toTint("0xFF6666")).toBe(0xff6666);
    expect(toTint(0x123456)).toBe(0x123456);
  });

  it("falls back to no tint (white) for missing or invalid values", () => {
    expect(toTint(undefined)).toBe(0xffffff);
    expect(toTint(null)).toBe(0xffffff);
    expect(toTint("")).toBe(0xffffff);
    expect(toTint("not-a-colour")).toBe(0xffffff);
  });
});
