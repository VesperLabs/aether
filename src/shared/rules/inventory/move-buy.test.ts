import { describe, expect, it } from "vitest";
import { moveItem } from ".";
import type { InventoryItem, InventoryState } from ".";

const potion = (amount: number): InventoryItem => ({
  id: "hp1",
  base: "hpPotion",
  slot: "stackable",
  type: "stackable",
  amount,
  cost: 10,
});
const sword: InventoryItem = { id: "sword1", base: "sword", slot: "hands", type: "weapon" };
const state = (inventory: InventoryState["inventory"]): InventoryState => ({
  inventory,
  equipment: {},
  abilities: {},
  gold: 100,
});
const buy = (s: InventoryState, item: InventoryItem, slot: number) =>
  moveItem(
    s,
    { from: { location: "shop", slot: 0, amount: 2 }, to: { location: "inventory", slot } },
    { shop: { npcId: "n1", slot: { item, stock: 5 } }, newId: () => "new1" },
  );

describe("buying a stackable the player already has", () => {
  it("merges into the stack even when dropped on another item", () => {
    const result = buy(state([potion(3), sword]), potion(1), 1);
    expect(result.moved && result.state.inventory).toEqual([potion(5), sword]);
    expect(result.moved && result.state.gold).toBe(80);
  });

  it("still refuses a non-stackable dropped on another item", () => {
    expect(buy(state([potion(3), sword]), { ...sword, id: "axe1" }, 1).moved).toBe(false);
  });
});
