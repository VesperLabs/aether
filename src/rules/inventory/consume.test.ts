import { describe, expect, it } from "vitest";
import { consumeItem } from ".";
import type { InventoryItem, InventoryState } from ".";

const sword: InventoryItem = {
  id: "sword1",
  base: "sword",
  slot: "hands",
  type: "weapon",
  cost: 8,
};
const potion = (amount: number, id = "hp1"): InventoryItem => ({
  id,
  base: "hpPotion",
  slot: "stackable",
  type: "stackable",
  amount,
  cost: 10,
  effects: { hp: 50 },
});
const bag = (items: (InventoryItem | null)[]): InventoryItem => ({
  id: "bag1",
  base: "bag",
  slot: "bag",
  type: "bag",
  items,
});
const state = (overrides: Partial<InventoryState> = {}): InventoryState => ({
  inventory: new Array(8).fill(null),
  equipment: {},
  abilities: {},
  gold: 100,
  ...overrides,
});

describe("consumeItem", () => {
  it("gives no buffs for food without any", () => {
    const food: InventoryItem = { id: "bread1", base: "food", type: "stackable", amount: 1 };
    const result = consumeItem(state({ inventory: [food] }), {
      location: "inventory",
      item: { id: "bread1" },
    });
    expect(result).toMatchObject({ consumed: true, isFood: true, buffs: {} });
  });

  it("uses one potion and reports its effects", () => {
    const s = state({ inventory: [potion(2)] });
    const result = consumeItem(s, {
      location: "inventory",
      item: { id: "hp1" },
    });
    expect(result).toMatchObject({
      consumed: true,
      isPotion: true,
      hp: 50,
      isFood: false,
    });
    expect(result.consumed && result.state.inventory[0]?.amount).toBe(1);
  });

  it("removes the last potion from a bag or from abilities", () => {
    const s = state({
      inventory: [bag([potion(1)])],
      abilities: { "1": potion(1, "hp2") },
    });
    const fromBag = consumeItem(s, { location: "bag", item: { id: "hp1" } });
    expect(fromBag.consumed && fromBag.state.inventory[0]?.items?.[0]).toBeNull();
    const fromAbilities = consumeItem(s, {
      location: "abilities",
      item: { id: "hp2" },
    });
    expect(fromAbilities.consumed && fromAbilities.state.abilities["1"]).toBeNull();
  });

  it("reports food buffs", () => {
    const food = {
      ...potion(1, "f1"),
      base: "food",
      buffs: { regeneration: 2 },
    };
    const result = consumeItem(state({ inventory: [food] }), {
      location: "inventory",
      item: { id: "f1" },
    });
    expect(result).toMatchObject({
      consumed: true,
      isFood: true,
      buffs: { regeneration: 2 },
    });
  });

  it("ignores things that are not consumable or not there", () => {
    const s = state({ inventory: [sword, potion(1)] });
    expect(consumeItem(s, { location: "inventory", item: { id: "sword1" } })).toEqual({
      consumed: false,
    });
    expect(consumeItem(s, { location: "inventory", item: { id: "nope" } })).toEqual({
      consumed: false,
    });
    expect(consumeItem(s, { location: "equipment", item: { id: "hp1" } })).toEqual({
      consumed: false,
    });
  });
});
