import { describe, expect, it } from "vitest";
import type { BuiltItem } from "@/content";
import { doubleClickMove } from "./double-click-move";

const sword = { slot: "hands", type: "weapon" } as BuiltItem;
const ring = { slot: "ring", type: "ring" } as BuiltItem;
const spell = { slot: "spell", type: "spell" } as BuiltItem;
const worn = {} as BuiltItem;

describe("doubleClickMove", () => {
  it("puts a weapon in the first open hand and refuses when both are full", () => {
    const picked = { item: sword, location: "inventory", slotKey: "3" };
    expect(doubleClickMove({ equipment: {} }, picked)?.to).toEqual({
      location: "equipment",
      slot: "handRight",
    });
    expect(doubleClickMove({ equipment: { handRight: worn } }, picked)?.to.slot).toBe("handLeft");
    expect(doubleClickMove({ equipment: { handRight: worn, handLeft: worn } }, picked)).toBeNull();
  });

  it("puts a ring in the open ring slot", () => {
    const move = doubleClickMove(
      { equipment: { ring1: worn } },
      { item: ring, location: "bag", slotKey: "0", bagId: "b" },
    );
    expect(move).toEqual({
      from: { bagId: "b", slot: "0", location: "bag" },
      to: { location: "equipment", slot: "ring2" },
    });
  });

  it("puts a spell in the first open ability slot", () => {
    const move = doubleClickMove(
      { abilities: { "1": worn, "2": worn } },
      { item: spell, location: "inventory", slotKey: "0" },
    );
    expect(move?.to).toEqual({ location: "abilities", slot: "3" });
  });

  it("takes worn gear and slotted spells off into the first open inventory slot", () => {
    const hero = { inventory: [worn, null, worn] };
    expect(
      doubleClickMove(hero, { item: sword, location: "equipment", slotKey: "handRight" })?.to,
    ).toEqual({ location: "inventory", slot: 1 });
    expect(doubleClickMove(hero, { item: spell, location: "abilities", slotKey: "2" })?.to).toEqual(
      {
        location: "inventory",
        slot: 1,
      },
    );
  });

  it("leaves potions on the action bar alone, so they are used", () => {
    const potion = { slot: "stackable", type: "stackable" } as BuiltItem;
    expect(doubleClickMove({}, { item: potion, location: "abilities", slotKey: "1" })).toBeNull();
  });
});
