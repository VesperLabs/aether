import { describe, expect, it } from "vitest";
import { skyLightAt } from "./sky-light";

describe("skyLightAt", () => {
  it("is bright and rich at noon, dark and drained at midnight", () => {
    const noon = skyLightAt(12);
    const midnight = skyLightAt(0);
    expect(noon.saturation).toBeGreaterThan(0);
    expect(midnight.saturation).toBeLessThan(0);
    expect(midnight.vignette).toBeGreaterThan(noon.vignette);
    expect(skyLightAt(24)).toEqual(midnight);
  });

  it("glows warm only around golden hour", () => {
    const { glow } = skyLightAt(18);
    expect(glow >> 16).toBeGreaterThan(glow & 0xff);
    expect(skyLightAt(12).glow).toBe(0);
    expect(skyLightAt(0).glow).toBe(0);
  });

  it("tints warm at dusk", () => {
    const { tint } = skyLightAt(18);
    expect(tint >> 16).toBeGreaterThan(tint & 0xff);
  });

  it("blends between keyed hours", () => {
    const between = skyLightAt(17.25);
    expect(between.saturation).toBeGreaterThan(skyLightAt(16.5).saturation);
    expect(between.saturation).toBeLessThan(skyLightAt(18).saturation);
  });
});
