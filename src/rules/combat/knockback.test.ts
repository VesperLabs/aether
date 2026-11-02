import { describe, expect, it } from "vitest";
import { rollsKnockback } from "./knockback";

describe("rollsKnockback", () => {
  it("always knocks back on a lunge", () => {
    expect(rollsKnockback(true, 0, () => 0.99)).toBe(true);
  });
  it("never knocks back without a chance, and doesn't roll", () => {
    let rolled = false;
    expect(rollsKnockback(false, undefined, () => ((rolled = true), 0))).toBe(false);
    expect(rolled).toBe(false);
  });
  it("knocks back on a roll within the chance", () => {
    expect(rollsKnockback(false, 20, () => 0.1)).toBe(true);
    expect(rollsKnockback(false, 20, () => 0.5)).toBe(false);
  });
});
