import { describe, expect, it } from "vitest";
import { zoomToCover } from "./cover-zoom";

describe("zoomToCover", () => {
  it("keeps the game's zoom when the map already fills the view", () => {
    expect(zoomToCover({ width: 1920, height: 1080 }, { width: 2000, height: 2000 }, 3)).toBe(3);
  });

  it("zooms in by whole steps until the map's tighter side fills the view", () => {
    expect(zoomToCover({ width: 5120, height: 1440 }, { width: 1000, height: 1000 }, 3)).toBe(6);
  });
});
