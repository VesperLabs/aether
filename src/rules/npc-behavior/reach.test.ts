import { describe, expect, it } from "vitest";
import { getSpellBand, getWeaponBand, isInBand } from "./reach";

describe("reach", () => {
  it("caps a spell's band at how far the projectile flies", () => {
    // Fireball says 200 but vanishes after 120
    const band = getSpellBand("fireball");
    expect(band?.min).toBe(50);
    expect(band?.max).toBeLessThan(120);
  });

  it("has no band for spells that don't hit enemies", () => {
    expect(getSpellBand("haste")).toBeUndefined();
  });

  it("keeps ranged weapon shots inside the arrow's flight", () => {
    const band = getWeaponBand(126);
    expect(isInBand({ x: 0, y: 0 }, { x: 100, y: 0 }, band)).toBe(true);
    expect(isInBand({ x: 0, y: 0 }, { x: 125, y: 0 }, band)).toBe(false);
  });
});
