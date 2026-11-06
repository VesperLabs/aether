import { describe, expect, it } from "vitest";
import { placeWeapon, resolveSheetPath } from "./store-plugin";

describe("placeWeapon", () => {
  const getAtlas = () => ({
    offsets: { human: { "up-stand": { left: { x: 1, y: 2 } } } },
  });

  it("moves one hand and keeps the rest of its pose", () => {
    const atlas = getAtlas();
    const placed = { frame: "up-stand", hand: "left", x: 5, y: -6 };
    expect(placeWeapon(atlas, placed)).toBe(true);
    expect(atlas.offsets.human["up-stand"].left).toEqual({ x: 5, y: -6 });
  });

  it("refuses anything that isn't a pose", () => {
    const atlas = getAtlas();
    expect(placeWeapon(atlas, { frame: "nope", hand: "left", x: 1, y: 1 })).toBe(false);
    expect(placeWeapon(atlas, { frame: "__proto__", hand: "left", x: 1, y: 1 })).toBe(false);
    expect(placeWeapon(atlas, { frame: "up-stand", hand: "left", x: 1.5, y: 1 })).toBe(false);
    expect(atlas).toEqual(getAtlas());
  });
});

describe("resolveSheetPath", () => {
  it("accepts a sheet in the atlas folder", () => {
    expect(resolveSheetPath("/repo/public", "./assets/atlas/hair/hair-1.png")).toBe(
      "/repo/public/assets/atlas/hair/hair-1.png",
    );
  });

  it("refuses anything else", () => {
    expect(resolveSheetPath("/repo/public", "../.env")).toBeUndefined();
    expect(resolveSheetPath("/repo/public", "./assets/atlas/../../../x.png")).toBeUndefined();
    expect(resolveSheetPath("/repo/public", "./assets/atlas/80x80.json")).toBeUndefined();
  });
});
