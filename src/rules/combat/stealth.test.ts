import { describe, expect, it } from "vitest";
import { STEALTH_GRACE_MS, isInStealthGrace } from "./stealth";

describe("isInStealthGrace", () => {
  it("holds for a moment after casting stealth", () => {
    expect(isInStealthGrace({ lastStealth: 1000 }, 1000)).toBe(true);
    expect(isInStealthGrace({ lastStealth: 1000 }, 1000 + STEALTH_GRACE_MS - 1)).toBe(true);
  });
  it("ends after the grace window, and never starts without a cast", () => {
    expect(isInStealthGrace({ lastStealth: 1000 }, 1000 + STEALTH_GRACE_MS)).toBe(false);
    expect(isInStealthGrace({}, 1000)).toBe(false);
  });
});
