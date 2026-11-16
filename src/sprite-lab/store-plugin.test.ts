import { describe, expect, it } from "vitest";
import { resolveSheetPath, setBodyFlags, setBodyHandPoints } from "./store-plugin";

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

describe("setBodyHandPoints", () => {
  const getAtlas = (): { offsets: Record<string, any> } => ({
    offsets: { human: { "up-stand": { left: { x: 1, y: 2 } } } },
  });
  const points = { "up-stand": { left: { x: 5, y: 6 } } };

  it("gives a body its points, and takes them away with null", () => {
    const atlas = getAtlas();
    expect(setBodyHandPoints(atlas, { body: "wolf", points })).toBe(true);
    expect(atlas.offsets.wolf).toEqual(points);
    expect(setBodyHandPoints(atlas, { body: "wolf", points: null })).toBe(true);
    expect(atlas).toEqual(getAtlas());
  });

  it("never takes the human's hands, and refuses anything that isn't points or a body", () => {
    const atlas = getAtlas();
    expect(setBodyHandPoints(atlas, { body: "human", points: null })).toBe(false);
    expect(setBodyHandPoints(atlas, { body: "__proto__", points })).toBe(false);
    expect(setBodyHandPoints(atlas, { body: "wolf", points: { nope: {} } })).toBe(false);
    const half = { "up-stand": { left: { x: 1.5, y: 2 } } };
    expect(setBodyHandPoints(atlas, { body: "wolf", points: half })).toBe(false);
    expect(atlas).toEqual(getAtlas());
  });
});

describe("setBodyFlags", () => {
  it("switches a known body's attack animations, leaving nothing behind when off", () => {
    const bodies: Record<string, { attackAnims?: boolean }> = { bat: {} };
    expect(setBodyFlags(bodies, { body: "bat", attackAnims: true })).toBe(true);
    expect(bodies.bat).toEqual({ attackAnims: true });
    expect(setBodyFlags(bodies, { body: "bat", attackAnims: false })).toBe(true);
    expect(bodies.bat).toEqual({});
  });

  it("refuses unknown bodies and anything that isn't a flag", () => {
    const bodies: Record<string, { attackAnims?: boolean }> = { bat: {} };
    expect(setBodyFlags(bodies, { body: "dragon", attackAnims: true })).toBe(false);
    expect(setBodyFlags(bodies, { body: "__proto__", attackAnims: true })).toBe(false);
    expect(setBodyFlags(bodies, { body: "bat", attackAnims: "yes" })).toBe(false);
    expect(bodies).toEqual({ bat: {} });
  });
});
