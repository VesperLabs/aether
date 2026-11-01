import { describe, expect, it } from "vitest";
import { createRng, seedFromString } from "./rng";
import { nearestTo } from "./rooms";
import { createSpatialHash } from "./spatial-hash";

describe("spatial hash", () => {
  it("finds what is near a point", () => {
    const hash = createSpatialHash(32, [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 40, y: 0 },
      { id: "c", x: 500, y: 500 },
    ]);
    expect(hash.near({ x: 0, y: 0 }, 50).map((item) => item.id)).toEqual(["a", "b"]);
    expect(hash.near({ x: 0, y: 0 }, 10).map((item) => item.id)).toEqual(["a"]);
  });

  it("finds the same nearest entity as a full scan", () => {
    const rng = createRng(7);
    const items = Array.from({ length: 50 }, (_, i) => ({ i, x: rng() * 2000, y: rng() * 2000 }));
    const hash = createSpatialHash(64, items);
    for (let n = 0; n < 200; n++) {
      const point = { x: rng() * 2400 - 200, y: rng() * 2400 - 200 };
      expect(hash.nearest(point)).toBe(nearestTo(items, point));
    }
  });

  it("is empty without entities", () => {
    expect(createSpatialHash(32, []).nearest({ x: 0, y: 0 })).toBeUndefined();
  });
});

describe("rng", () => {
  it("repeats for the same seed", () => {
    const first = createRng(seedFromString("npc-1"));
    const second = createRng(seedFromString("npc-1"));
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});
