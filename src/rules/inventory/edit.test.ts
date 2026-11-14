import { describe, expect, it } from "vitest";
import {
  addInventoryItem,
  deleteAbilityAtId,
  deleteBagItemAtId,
  findBagItemById,
  updateBagItemAtId,
} from ".";
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

describe("deleteAbilityAtId", () => {
  it("leaves the abilities alone for an unknown id", () => {
    const abilities = { 1: { ...apple } };
    expect(deleteAbilityAtId(abilities, "nope")).toBe(abilities);
  });
});

describe("addInventoryItem", () => {
  const card: InventoryItem = { id: "crabCard", base: "card", type: "stackable", amount: 1 };

  it("stacks a stackable onto one the player carries loose", () => {
    expect(addInventoryItem([null, { ...card }], card)).toEqual([null, { ...card, amount: 2 }]);
  });

  it("stacks onto one in a bag", () => {
    const bag: InventoryItem = { id: "bag", base: "bag", items: [{ ...card, amount: 3 }] };
    expect(addInventoryItem([bag, null], card)[0]?.items?.[0]?.amount).toBe(4);
  });

  it("puts anything else in the first empty slot", () => {
    const sword: InventoryItem = { id: "s1", base: "sword" };
    expect(addInventoryItem([sword, null], { ...sword, id: "s2" })[1]?.id).toBe("s2");
  });
});
