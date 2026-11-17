import { describe, expect, it } from "vitest";
import { piercesThrough, takeHits } from "./pierce";

describe("piercesThrough", () => {
  it("pierces unless told not to", () => {
    expect(piercesThrough({})).toBe(true);
    expect(piercesThrough({ pierces: false })).toBe(false);
  });
});

describe("takeHits", () => {
  const foes = new Set(["foe1", "foe2"]);
  const mayTouch = (id: string) => foes.has(id);

  it("a piercing hit lands on everyone it overlapped", () => {
    expect(takeHits(["ally", "foe1", "foe2"], { pierces: true, mayTouch })).toEqual({
      hits: ["ally", "foe1", "foe2"],
      stops: false,
    });
  });

  it("one that doesn't pierce passes allies and stops on the first foe", () => {
    expect(takeHits(["ally", "foe1", "foe2"], { pierces: false, mayTouch })).toEqual({
      hits: ["foe1"],
      stops: true,
    });
  });

  it("flies on when it only overlapped those it may not touch", () => {
    expect(takeHits(["ally"], { pierces: false, mayTouch })).toEqual({ hits: [], stops: false });
  });
});
