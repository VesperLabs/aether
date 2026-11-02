import { describe, expect, it } from "vitest";
import { MAX_REWIND_MS, clampRewind, createPoseHistory } from "./pose-history";

describe("createPoseHistory", () => {
  const history = () => {
    const h = createPoseHistory(3);
    h.record(0, [{ id: "a", x: 0, y: 0 }]);
    h.record(50, [{ id: "a", x: 10, y: 20 }]);
    h.record(100, [
      { id: "a", x: 20, y: 40 },
      { id: "b", x: 5, y: 5 },
    ]);
    return h;
  };

  it("blends between the ticks around the time asked", () => {
    expect(history().positionAt("a", 25)).toEqual({ x: 5, y: 10 });
    expect(history().positionAt("a", 75)).toEqual({ x: 15, y: 30 });
  });

  it("gives nothing for now or later, so callers use the live position", () => {
    expect(history().positionAt("a", 100)).toBeUndefined();
    expect(history().positionAt("a", 500)).toBeUndefined();
  });

  it("uses the oldest kept tick for older times, and the first sighting for newcomers", () => {
    expect(history().positionAt("a", -40)).toEqual({ x: 0, y: 0 });
    expect(history().positionAt("b", 60)).toEqual({ x: 5, y: 5 });
    expect(history().positionAt("nobody", 60)).toBeUndefined();
  });

  it("forgets a character, so later rewinds use only where it stood after", () => {
    const h = history();
    h.forget("a");
    expect(h.positionAt("a", 25)).toBeUndefined();
    h.record(150, [{ id: "a", x: 90, y: 90 }]);
    expect(h.positionAt("a", 25)).toEqual({ x: 90, y: 90 });
  });

  it("drops ticks past its capacity", () => {
    const h = history();
    h.record(150, [{ id: "a", x: 30, y: 60 }]);
    expect(h.positionAt("a", 0)).toEqual({ x: 10, y: 20 });
  });
});

describe("clampRewind", () => {
  it("keeps reports within 0 and the cap", () => {
    expect(clampRewind(80)).toBe(80);
    expect(clampRewind(-5)).toBe(0);
    expect(clampRewind(10_000)).toBe(MAX_REWIND_MS);
    expect(clampRewind("x")).toBe(0);
    expect(clampRewind(Number.NaN)).toBe(0);
  });
});
