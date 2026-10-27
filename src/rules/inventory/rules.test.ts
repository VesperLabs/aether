import { describe, expect, it } from "vitest";
import {
  checkSlotsMatch,
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
const robe: InventoryItem = {
  id: "robe1",
  base: "robe",
  slot: "armor",
  type: "armor",
};
const ring: InventoryItem = {
  id: "ring1",
  base: "band",
  slot: "ring",
  type: "ring",
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
const inBag = (slot: number | undefined, bagId = "bag1") => ({
  location: "bag",
  bagId,
  slot,
});

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
    expect(subtractInventoryItemAtId(s.inventory, "hp1", 4)).toMatchObject({
      subtracted: null,
    });
  });
});

describe("moveItem between places", () => {
  it("equips an item and swaps back what was equipped", () => {
    const s = state({
      inventory: [sword],
      equipment: { handLeft: { ...sword, id: "old" } },
    });
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

  it("refuses equipment to abilities so nothing is saved", () => {
    const s = state({ equipment: { armor: robe } });
    expect(moveItem(s, { from: eq("armor"), to: abil("1") }, context())).toEqual({
      moved: false,
    });
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

  it("swaps with bag slot 0 instead of picking an open slot", () => {
    const s = state({ inventory: [bag([sword, null]), robe] });
    const next = moved(moveItem(s, { from: inv(1), to: inBag(0) }, context()));
    expect(next.inventory[0]?.items?.[0]?.id).toBe("robe1");
    expect(next.inventory[1]?.id).toBe("sword1");
  });

  it("fills an empty bag up to its space", () => {
    const s = state({ inventory: [{ ...bag([]), space: 4 }, robe] });
    const next = moved(moveItem(s, { from: inv(1), to: inBag(undefined) }, context()));
    expect(next.inventory[0]?.items?.[0]?.id).toBe("robe1");
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

  const sellFrom = (s: InventoryState, from: Record<string, unknown>) =>
    moveItem(s, { from, to: { location: "shop" } } as never, context(shelf(sword)));

  it("refuses to sell more than the stack, or a bad amount, and pays nothing", () => {
    const s = state({ inventory: [potion(5)] });
    for (const amount of [6, 0, -1, 1.5, "abc"]) {
      expect(sellFrom(s, { ...inv(0), amount }).moved).toBe(false);
    }
  });

  it("sells a whole stack and removes it", () => {
    const next = moved(sellFrom(state({ inventory: [potion(5)] }), { ...inv(0), amount: 5 }));
    expect(next.inventory[0]).toBeNull();
    expect(next.gold).toBe(150);
  });

  it("checks the stack size for bags and abilities", () => {
    const inBagState = state({
      inventory: [bag([potion(3), null, null, null])],
    });
    const bagFrom = { location: "bag", bagId: "bag1", slot: 0 };
    expect(sellFrom(inBagState, { ...bagFrom, amount: 4 }).moved).toBe(false);
    const part = moved(sellFrom(inBagState, { ...bagFrom, amount: 2 }));
    expect(part.inventory[0]?.items?.[0]?.amount).toBe(1);
    expect(part.gold).toBe(120);
    const all = moved(sellFrom(inBagState, { ...bagFrom, amount: 3 }));
    expect(all.inventory[0]?.items?.[0]).toBeNull();
    expect(all.gold).toBe(130);

    const abil = state({ abilities: { a1: potion(3) } });
    const abFrom = { location: "abilities", slot: "a1" };
    expect(sellFrom(abil, { ...abFrom, amount: 4 }).moved).toBe(false);
    const abPart = moved(sellFrom(abil, { ...abFrom, amount: 2 }));
    expect(abPart.abilities.a1?.amount).toBe(1);
    expect(abPart.gold).toBe(120);
    const abAll = moved(sellFrom(abil, { ...abFrom, amount: 3 }));
    expect(abAll.abilities.a1).toBeNull();
    expect(abAll.gold).toBe(130);
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
    expect(result).toEqual({
      moved: false,
      error: "You cannot afford this item",
    });
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
