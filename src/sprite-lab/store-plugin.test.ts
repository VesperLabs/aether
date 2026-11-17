import { describe, expect, it } from "vitest";
import { resolveSheetPath, toBodyFile } from "./store-plugin";

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

describe("toBodyFile", () => {
  const shape = {
    hitBox: { width: 18, height: 28 },
    feetRadius: 8,
    headY: -26,
    spriteAboveFeet: 14,
    portraitRect: [0, 160, 80, 80],
    habitat: "air",
  };
  const hands = { "up-stand": { left: { x: 1, y: 2 } } };
  const getBodies = (): Record<string, any> => ({ human: { ...shape, hands }, bat: shape });

  it("writes a known body, leaving attack animations out when off", () => {
    const data = { ...shape, attackAnims: true, feetRadius: 6 };
    expect(toBodyFile(getBodies(), { body: "bat", data })).toEqual(data);
    expect(
      toBodyFile(getBodies(), { body: "bat", data: { ...shape, attackAnims: false } }),
    ).toEqual(shape);
  });

  it("gives a body hand points for the human's frames, at whole pixels", () => {
    const withHands = { ...shape, hands: { "up-stand": { right: { x: 5, y: 6 } } } };
    expect(toBodyFile(getBodies(), { body: "bat", data: withHands })).toEqual(withHands);
    const off = { ...shape, hands: { "down-stand": { right: { x: 5, y: 6 } } } };
    expect(toBodyFile(getBodies(), { body: "bat", data: off })).toBeUndefined();
    const half = { ...shape, hands: { "up-stand": { right: { x: 0.5, y: 6 } } } };
    expect(toBodyFile(getBodies(), { body: "bat", data: half })).toBeUndefined();
  });

  it("never takes the human's hands away", () => {
    expect(toBodyFile(getBodies(), { body: "human", data: shape })).toBeUndefined();
  });

  it("refuses unknown bodies and anything that isn't a body", () => {
    const refuse = (body: string, data: object) =>
      expect(toBodyFile(getBodies(), { body, data })).toBeUndefined();
    refuse("dragon", shape);
    refuse("__proto__", shape);
    refuse("bat", { ...shape, attackAnims: "yes" });
    refuse("bat", { ...shape, feetRadius: 0 });
    refuse("bat", { ...shape, headY: 4 });
    refuse("bat", { ...shape, hitBox: { width: 1.5, height: 2 } });
    refuse("bat", { ...shape, extra: 1 });
    refuse("bat", { ...shape, habitat: "lava" });
  });
});
