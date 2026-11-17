import { describe, expect, it } from "vitest";
import { dragShape, nudgeShape } from "./body-handles";

const shape = { hitBox: { width: 18, height: 46 }, feetRadius: 8, headY: -44, spriteAboveFeet: 14 };

describe("dragShape", () => {
  it("moves only what the handle controls", () => {
    expect(dragShape("top", shape, { x: 30, y: -32 })).toEqual({
      hitBox: { width: 18, height: 40 },
    });
    expect(dragShape("side", shape, { x: -10, y: 99 })).toEqual({
      hitBox: { width: 20, height: 46 },
    });
    expect(dragShape("feet", shape, { x: 3, y: 4 })).toEqual({ feetRadius: 5 });
    expect(dragShape("head", shape, { x: 0, y: -30.4 })).toEqual({ headY: -30 });
  });

  it("keeps the head up and every size at least a pixel", () => {
    expect(dragShape("head", shape, { x: 0, y: 12 })).toEqual({ headY: 0 });
    expect(dragShape("feet", shape, { x: 0, y: 0 })).toEqual({ feetRadius: 1 });
    expect(dragShape("top", shape, { x: 0, y: 20 })).toEqual({ hitBox: { width: 18, height: 1 } });
  });
});

describe("nudgeShape", () => {
  it("grows up and out", () => {
    expect(nudgeShape("top", shape, { x: 0, y: -1 })).toEqual({
      hitBox: { width: 18, height: 47 },
    });
    expect(nudgeShape("side", shape, { x: 1, y: 0 })).toEqual({
      hitBox: { width: 20, height: 46 },
    });
    expect(nudgeShape("head", shape, { x: 0, y: -10 })).toEqual({ headY: -54 });
    expect(nudgeShape("feet", { ...shape, feetRadius: 1 }, { x: -1, y: 0 })).toEqual({
      feetRadius: 1,
    });
  });
});
