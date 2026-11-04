import { describe, expect, it } from "vitest";
import { getHudZoomFor, getLoginScale, getModalScale } from "./hud-scale";

describe("hud scale", () => {
  it("grows with the window, within its limits", () => {
    expect(getHudZoomFor(1920, 1080)).toBe("1.44");
    expect(getHudZoomFor(1, 1)).toBe("0.75");
    expect(getHudZoomFor(7680, 4320)).toBe("2.00");
  });

  it("makes the login bigger than other modals", () => {
    expect(getLoginScale("0.85")).toBeCloseTo(1.2);
    expect(getLoginScale("1.5")).toBeCloseTo(1.8);
  });

  it("never shrinks a modal", () => {
    expect(getModalScale("0.85")).toBe(1);
    expect(getModalScale("1.44")).toBe(1.44);
  });
});
