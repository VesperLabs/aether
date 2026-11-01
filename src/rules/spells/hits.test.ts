import { describe, expect, it } from "vitest";
import { findSpellHits, type SpellHitInput } from "./hits";

const victim = (id: string, x: number, y = 0, isDead = false) => ({
  id,
  x,
  y,
  isDead,
  bodySize: 8,
  hitBoxSize: { width: 16, height: 32 },
});

const base: SpellHitInput = {
  shape: { kind: "circle", x: 0, y: 0, radius: 10 },
  victims: [victim("a", 0), victim("b", 500), victim("dead", 0, 0, true)],
  hitIds: [],
  allowedTargets: ["enemy"],
  caster: { id: "c", x: -20, y: 0, isPlayer: true },
  isMeleeAttack: false,
};

describe("findSpellHits", () => {
  it("hits living victims inside the shape", () => {
    expect(findSpellHits(base)).toEqual(["a"]);
  });
  it("skips victims already hit and hits nothing without a shape", () => {
    expect(findSpellHits({ ...base, hitIds: ["a"] })).toEqual([]);
    expect(findSpellHits({ ...base, shape: null })).toEqual([]);
  });
  it("only hits the target of a single-target spell", () => {
    expect(findSpellHits({ ...base, targetId: "b" })).toEqual([]);
  });
  it("melee misses what is behind the caster", () => {
    const melee = { ...base, isMeleeAttack: true, direction: "left" };
    expect(findSpellHits(melee)).toEqual([]);
    expect(findSpellHits({ ...melee, direction: "right" })).toEqual(["a"]);
  });
});
