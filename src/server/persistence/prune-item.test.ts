import { describe, expect, it } from "vitest";
import { pruneItemFromUser } from "./prune-item";

describe("pruneItemFromUser", () => {
  it("empties every slot holding the key, including inside bags", () => {
    const doc = {
      equipment: { helmet: { key: "voltball" }, armor: { key: "robe" } },
      abilities: { 1: { key: "voltball" } },
      inventory: [{ key: "voltball" }, { key: "bag", items: [{ key: "voltball" }, null] }, null],
    };
    expect(pruneItemFromUser(doc, "voltball")).toBe(true);
    expect(doc).toEqual({
      equipment: { helmet: null, armor: { key: "robe" } },
      abilities: { 1: null },
      inventory: [null, { key: "bag", items: [null, null] }, null],
    });
  });

  it("reports no change when the key isn't there", () => {
    expect(pruneItemFromUser({ equipment: {}, inventory: [{ key: "robe" }] }, "voltball")).toBe(
      false,
    );
  });
});
