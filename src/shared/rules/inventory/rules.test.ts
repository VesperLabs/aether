import { describe, expect, it } from "vitest";
import {
  checkSlotsMatch,
  consumeItem,
  dropItem,
  findBagItemById,
  findOpenBagSlot,
  isInventoryFull,
  moveItem,
  MAX_INVENTORY_ITEMS,
  subtractInventoryItemAtId,
} from ".";
import type { InventoryItem, InventoryState, MoveContext } from ".";

/** Freezes everything so a rule that mutates its input throws. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const sword: InventoryItem = {
  id: "sword1",
  base: "sword",
  slot: "hands",
  type: "weapon",
  cost: 8,
};
const robe: InventoryItem = { id: "robe1", base: "robe", slot: "armor", type: "armor" };
const ring: InventoryItem = { id: "ring1", base: "band", slot: "ring", type: "ring" };
const potion = (amount: number, id = "hp1"): InventoryItem => ({
  id,
  base: "hpPotion",
  slot: "stackable",
  type: "stackable",
  amount,
  cost: 10,
  effects: { hp: 50 },
});
const bag = (items: (InventoryItem | null)[] = [null, null, null, null]): InventoryItem => ({
  id: "bag1",
  base: "bag",
  slot: "bag",
  type: "bag",
  items,
});

function state(overrides: Partial<InventoryState> = {}): InventoryState {
  return deepFreeze({
    inventory: new Array(8).fill(null),
    equipment: {},
    abilities: {},
    gold: 100,
    ...overrides,
  });
}

let ids = 0;
const context = (overrides: Partial<MoveContext> = {}): MoveContext => ({
  newId: () => `new${ids++}`,
  ...overrides,
});

const inv = (slot: number) => ({ location: "inventory", slot });
const eq = (slot: string) => ({ location: "equipment", slot });
const abil = (slot: string) => ({ location: "abilities", slot });
const inBag = (slot: number | undefined, bagId = "bag1") => ({ location: "bag", bagId, slot });

function moved(result: ReturnType<typeof moveItem>) {
  if (result.moved === false) throw new Error(`move was refused: ${result.error}`);
  return result.state;
}

describe("checkSlotsMatch", () => {
  it("matches equal slots, hands to either hand and rings to either ring", () => {
    expect(checkSlotsMatch("armor", "armor")).toBe(true);
    expect(checkSlotsMatch("hands", "handLeft")).toBe(true);
    expect(checkSlotsMatch("handRight", "hands")).toBe(true);
    expect(checkSlotsMatch("ring", "ring2")).toBe(true);
    expect(checkSlotsMatch("armor", "handLeft")).toBe(false);
    expect(checkSlotsMatch("ring", "handLeft")).toBe(false);
  });
});

describe("lookups", () => {
  it("finds items in bags and the first open bag slot", () => {
    const s = state({ inventory: [bag([null, potion(3)])] });
    expect(findBagItemById(s.inventory, "hp1")).toMatchObject({ slotName: 1 });
    expect(findOpenBagSlot(s.inventory, "bag1", sword)).toBe(0);
    const stacked = state({ inventory: [bag([sword, potion(3)])] });
    expect(findOpenBagSlot(stacked.inventory, "bag1", potion(1))).toBe(1);
  });

  it("is full only when every slot is taken and the inventory is at its limit", () => {
    expect(isInventoryFull(new Array(MAX_INVENTORY_ITEMS).fill(sword))).toBe(true);
    expect(isInventoryFull(new Array(MAX_INVENTORY_ITEMS - 1).fill(sword))).toBe(false);
    expect(isInventoryFull([null, ...new Array(MAX_INVENTORY_ITEMS - 1).fill(sword)])).toBe(false);
  });

  it("subtracts from a stack and removes it at zero", () => {
    const s = state({ inventory: [potion(3)] });
    const some = subtractInventoryItemAtId(s.inventory, "hp1", 2);
    expect(some.subtracted).toBe(2);
    expect(some.result[0]?.amount).toBe(1);
    expect(subtractInventoryItemAtId(s.inventory, "hp1", 3).result[0]).toBeNull();
    expect(subtractInventoryItemAtId(s.inventory, "hp1", 4)).toMatchObject({ subtracted: null });
  });
});

describe("moveItem between places", () => {
  it("equips an item and swaps back what was equipped", () => {
    const s = state({ inventory: [sword], equipment: { handLeft: { ...sword, id: "old" } } });
    const next = moved(moveItem(s, { from: inv(0), to: eq("handLeft") }, context()));
    expect(next.equipment.handLeft?.id).toBe("sword1");
    expect(next.inventory[0]?.id).toBe("old");
  });

  it("refuses an item that does not fit the slot", () => {
    const s = state({ inventory: [robe] });
    expect(moveItem(s, { from: inv(0), to: eq("handLeft") }, context())).toEqual({ moved: false });
  });

  it("unequips into an empty inventory slot", () => {
    const s = state({ equipment: { armor: robe } });
    const next = moved(moveItem(s, { from: eq("armor"), to: inv(3) }, context()));
    expect(next.equipment.armor).toBeNull();
    expect(next.inventory[3]?.id).toBe("robe1");
  });

  it("refuses to swap an unequipped item that does not fit the equipment slot", () => {
    const s = state({ inventory: [sword], equipment: { armor: robe } });
    expect(moveItem(s, { from: eq("armor"), to: inv(0) }, context()).moved).toBe(false);
  });

  it("puts a ring in either ring slot", () => {
    const s = state({ inventory: [ring] });
    const next = moved(moveItem(s, { from: inv(0), to: eq("ring2") }, context()));
    expect(next.equipment.ring2?.id).toBe("ring1");
  });

  it("moves between inventory slots and ignores dropping an item on itself", () => {
    const s = state({ inventory: [sword] });
    const next = moved(moveItem(s, { from: inv(0), to: inv(4) }, context()));
    expect(next.inventory[0]).toBeNull();
    expect(next.inventory[4]?.id).toBe("sword1");
    expect(moveItem(s, { from: inv(0), to: inv(0) }, context()).moved).toBe(false);
  });

  it("only lets spells and stackables into abilities", () => {
    const s = state({ inventory: [sword, potion(2)] });
    expect(moveItem(s, { from: inv(0), to: abil("1") }, context()).moved).toBe(false);
    const next = moved(moveItem(s, { from: inv(1), to: abil("1") }, context()));
    expect(next.abilities["1"]?.id).toBe("hp1");
  });

  it("does nothing for equipment to abilities", () => {
    const s = state({ equipment: { armor: robe } });
    expect(moved(moveItem(s, { from: eq("armor"), to: abil("1") }, context()))).toEqual(s);
  });
});

describe("moveItem and bags", () => {
  it("drops an item on a bag into its first open slot", () => {
    const s = state({ inventory: [bag([sword, null]), robe] });
    const next = moved(moveItem(s, { from: inv(1), to: inBag(undefined) }, context()));
    expect(next.inventory[1]).toBeNull();
    expect(next.inventory[0]?.items?.[1]?.id).toBe("robe1");
  });

  it("answers a full bag with an error", () => {
    const full = state({ inventory: [bag([sword, sword2()]), robe] });
    expect(moveItem(full, { from: inv(1), to: inBag(undefined) }, context())).toEqual({
      moved: false,
      error: "Bag is full.",
    });
  });

  it("does not put bags in bags", () => {
    const other = { ...bag(), id: "bag2" };
    const s = state({ inventory: [bag(), other] });
    expect(moveItem(s, { from: inv(1), to: inBag(0) }, context())).toEqual({
      moved: false,
      error: "Cannot put bags in bags.",
    });
  });

  it("moves between a bag and the inventory", () => {
    const s = state({ inventory: [bag([sword])] });
    const next = moved(moveItem(s, { from: inBag(0), to: inv(2) }, context()));
    expect(next.inventory[2]?.id).toBe("sword1");
    expect(next.inventory[0]?.items?.[0]).toBeNull();
  });

  it("refuses a bag that does not exist", () => {
    const s = state({ inventory: [sword] });
    expect(moveItem(s, { from: inv(0), to: inBag(1, "ghost") }, context()).moved).toBe(false);
  });
});

function sword2(): InventoryItem {
  return { ...sword, id: "sword2" };
}

describe("moveItem with shops", () => {
  const shelf = (item: InventoryItem, stock = 5) => ({
    shop: { npcId: "n1", slot: { item, stock } },
  });

  it("sells part of a stack for its cost", () => {
    const s = state({ inventory: [potion(5)] });
    const next = moved(
      moveItem(
        s,
        { from: { ...inv(0), amount: 2 }, to: { location: "shop" } },
        context(shelf(sword)),
      ),
    );
    expect(next.inventory[0]?.amount).toBe(3);
    expect(next.gold).toBe(120);
  });

  it("sells an equipped item", () => {
    const s = state({ equipment: { handLeft: sword } });
    const next = moved(moveItem(s, { from: eq("handLeft"), to: { location: "shop" } }, context()));
    expect(next.equipment.handLeft).toBeNull();
    expect(next.gold).toBe(108);
  });

  it("buys an item into an empty slot, removing the shop inflation", () => {
    const s = state();
    const next = moved(
      moveItem(
        s,
        { from: { location: "shop", slot: 0 }, to: inv(2) },
        context(shelf({ ...sword, id: "shelf", cost: 40 })),
      ),
    );
    expect(next.inventory[2]).toMatchObject({
      base: "sword",
      cost: 10,
      id: expect.stringMatching(/^new/),
    });
    expect(next.gold).toBe(60);
  });

  it("refuses when the player cannot afford it", () => {
    const s = state({ gold: 1 });
    const result = moveItem(
      s,
      { from: { location: "shop", slot: 0 }, to: inv(2) },
      context(shelf({ ...sword, cost: 40 })),
    );
    expect(result).toEqual({ moved: false, error: "You cannot afford this item" });
  });

  it("refuses to buy into an occupied slot, without a shop target or out of stock", () => {
    const s = state({ inventory: [null, robe] });
    const from = { location: "shop", slot: 0 };
    expect(moveItem(s, { from, to: inv(1) }, context(shelf(sword))).moved).toBe(false);
    expect(moveItem(s, { from, to: inv(2) }, context()).moved).toBe(false);
    expect(moveItem(s, { from, to: inv(2) }, context(shelf(sword, 0))).moved).toBe(false);
  });

  it("adds a bought stackable to the stack the player already has", () => {
    const s = state({ inventory: [potion(2)], gold: 200 });
    const stackable = { ...potion(1), cost: 40 };
    const next = moved(
      moveItem(
        s,
        { from: { location: "shop", slot: 0, amount: 3 }, to: inv(4) },
        context(shelf(stackable)),
      ),
    );
    expect(next.inventory[0]?.amount).toBe(5);
    expect(next.inventory[4]).toBeUndefined();
    expect(next.gold).toBe(80);
  });
});

describe("dropItem", () => {
  it("drops an equipped item", () => {
    const s = state({ equipment: { armor: robe } });
    const result = dropItem(s, { location: "equipment", item: { id: "robe1" } });
    expect(result).toMatchObject({ dropped: true, item: { id: "robe1" } });
    expect(result.dropped && result.state.equipment.armor).toBeNull();
  });

  it("drops part of a stack and the whole stack", () => {
    const s = state({ inventory: [potion(5)] });
    const part = dropItem(s, { location: "inventory", item: { id: "hp1" }, amount: 2 });
    expect(part).toMatchObject({ dropped: true, item: { amount: 2 } });
    expect(part.dropped && part.state.inventory[0]?.amount).toBe(3);
    const all = dropItem(s, { location: "inventory", item: { id: "hp1" }, amount: 9 });
    expect(all).toMatchObject({ dropped: true, item: { amount: 5 } });
    expect(all.dropped && all.state.inventory[0]).toBeNull();
  });

  it("drops from a bag and from abilities", () => {
    const s = state({ inventory: [bag([potion(4)])], abilities: { "1": potion(2, "hp2") } });
    const fromBag = dropItem(s, { location: "bag", item: { id: "hp1" }, amount: 1 });
    expect(fromBag.dropped && fromBag.state.inventory[0]?.items?.[0]?.amount).toBe(3);
    const fromAbilities = dropItem(s, { location: "abilities", item: { id: "hp2" }, amount: 5 });
    expect(fromAbilities.dropped && fromAbilities.state.abilities["1"]).toBeNull();
  });

  it("refuses a bag with items, and items it cannot find", () => {
    const s = state({ inventory: [sword] });
    expect(
      dropItem(s, { location: "inventory", item: { id: "bag1", base: "bag", items: [sword] } }),
    ).toEqual({ dropped: false, error: "Cannot drop a bag with items inside of it." });
    expect(dropItem(s, { location: "inventory", item: { id: "nope" } })).toEqual({
      dropped: false,
    });
    expect(dropItem(s, { location: "equipment", item: { id: "nope" } })).toEqual({
      dropped: false,
    });
  });
});

describe("consumeItem", () => {
  it("uses one potion and reports its effects", () => {
    const s = state({ inventory: [potion(2)] });
    const result = consumeItem(s, { location: "inventory", item: { id: "hp1" } });
    expect(result).toMatchObject({ consumed: true, isPotion: true, hp: 50, isFood: false });
    expect(result.consumed && result.state.inventory[0]?.amount).toBe(1);
  });

  it("removes the last potion from a bag or from abilities", () => {
    const s = state({ inventory: [bag([potion(1)])], abilities: { "1": potion(1, "hp2") } });
    const fromBag = consumeItem(s, { location: "bag", item: { id: "hp1" } });
    expect(fromBag.consumed && fromBag.state.inventory[0]?.items?.[0]).toBeNull();
    const fromAbilities = consumeItem(s, { location: "abilities", item: { id: "hp2" } });
    expect(fromAbilities.consumed && fromAbilities.state.abilities["1"]).toBeNull();
  });

  it("reports food buffs", () => {
    const food = { ...potion(1, "f1"), base: "food", buffs: { regeneration: 2 } };
    const result = consumeItem(state({ inventory: [food] }), {
      location: "inventory",
      item: { id: "f1" },
    });
    expect(result).toMatchObject({ consumed: true, isFood: true, buffs: { regeneration: 2 } });
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
