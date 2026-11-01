import { describe, expect, it } from "vitest";
import { addThreat, decayThreat, pickThreatTarget, pruneThreat } from ".";

describe("threat", () => {
  it("adds up per player", () => {
    const table = addThreat(addThreat({}, "a", 10), "a", 5);
    expect(table).toEqual({ a: 15 });
    expect(addThreat(table, "b", 0)).toBe(table);
  });

  it("targets the top player, switching only past 110% of the current one", () => {
    expect(pickThreatTarget({ a: 10, b: 20 }, null)).toBe("b");
    expect(pickThreatTarget({ a: 10, b: 10.5 }, "a")).toBe("a");
    expect(pickThreatTarget({ a: 10, b: 12 }, "a")).toBe("b");
    expect(pickThreatTarget({}, "a")).toBeUndefined();
  });

  it("fades and drops players who ran out or left", () => {
    expect(decayThreat({ a: 100, b: 1 }, 1000)).toEqual({ a: 95 });
    expect(pruneThreat({ a: 1, b: 2 }, (id) => id === "b")).toEqual({ b: 2 });
  });
});
