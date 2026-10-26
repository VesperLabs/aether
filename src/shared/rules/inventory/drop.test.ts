import { describe, expect, it } from "vitest";
import { dropItem } from ".";
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

const robe: InventoryItem = {
  id: "robe1",
  base: "robe",
  slot: "armor",
  type: "armor",
};

describe("dropItem", () => {
  it("drops an equipped item", () => {
    const s = state({ equipment: { armor: robe } });
    const result = dropItem(s, {
      location: "equipment",
      item: { id: "robe1" },
    });
    expect(result).toMatchObject({ dropped: true, item: { id: "robe1" } });
    expect(result.dropped && result.state.equipment.armor).toBeNull();
  });

  it("drops part of a stack and the whole stack", () => {
    const s = state({ inventory: [potion(5)] });
    const part = dropItem(s, {
      location: "inventory",
      item: { id: "hp1" },
      amount: 2,
    });
    expect(part).toMatchObject({ dropped: true, item: { amount: 2 } });
    expect(part.dropped && part.state.inventory[0]?.amount).toBe(3);
    const all = dropItem(s, {
      location: "inventory",
      item: { id: "hp1" },
      amount: 9,
    });
    expect(all).toMatchObject({ dropped: true, item: { amount: 5 } });
    expect(all.dropped && all.state.inventory[0]).toBeNull();
  });

  it("drops from a bag and from abilities", () => {
    const s = state({
      inventory: [bag([potion(4)])],
      abilities: { "1": potion(2, "hp2") },
    });
    const fromBag = dropItem(s, {
      location: "bag",
      item: { id: "hp1" },
      amount: 1,
    });
    expect(fromBag.dropped && fromBag.state.inventory[0]?.items?.[0]?.amount).toBe(3);
    const fromAbilities = dropItem(s, {
      location: "abilities",
      item: { id: "hp2" },
      amount: 5,
    });
    expect(fromAbilities.dropped && fromAbilities.state.abilities["1"]).toBeNull();
  });

  it("refuses a bag with items, and items it cannot find", () => {
    const s = state({ inventory: [sword] });
    expect(
      dropItem(s, {
        location: "inventory",
        item: { id: "bag1", base: "bag", items: [sword] },
      }),
    ).toEqual({
      dropped: false,
      error: "Cannot drop a bag with items inside of it.",
    });
    expect(dropItem(s, { location: "inventory", item: { id: "nope" } })).toEqual({
      dropped: false,
    });
    expect(dropItem(s, { location: "equipment", item: { id: "nope" } })).toEqual({
      dropped: false,
    });
  });
});
