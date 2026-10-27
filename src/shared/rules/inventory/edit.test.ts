import { describe, expect, it } from "vitest";
import { deleteBagItemAtId, findBagItemById, updateBagItemAtId } from ".";
import type { InventoryItem } from ".";

const apple: InventoryItem = { id: "apple1", base: "food", type: "stackable", amount: 2 };
const bagA: InventoryItem = { id: "bagA", base: "bag", items: [null, { ...apple }] };
const bagB: InventoryItem = { id: "bagB", base: "bag", items: [{ ...apple, amount: 5 }] };

describe("bag edits with an id in two bags", () => {
  const inventory = [bagA, bagB];

  it("finds the match in the first bag", () => {
    expect(findBagItemById(inventory, "apple1")).toEqual({ slotName: 1, item: bagA.items?.[1] });
  });

  it("updates only that match", () => {
    const next = updateBagItemAtId(inventory, "apple1", { ...apple, amount: 9 });
    expect(next[0]?.items?.[1]?.amount).toBe(9);
    expect(next[1]?.items?.[0]?.amount).toBe(5);
  });

  it("deletes only that match", () => {
    const next = deleteBagItemAtId(inventory, "apple1");
    expect(next[0]?.items?.[1]).toBeNull();
    expect(next[1]?.items?.[0]?.amount).toBe(5);
  });
});
