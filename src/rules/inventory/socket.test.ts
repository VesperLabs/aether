import { describe, expect, it } from "vitest";
import { ItemBuilder, type Dice } from "@/content";
import { moveItem } from "./move";
import type { InventoryItem, InventoryState } from "./types";

const dice: Dice = { random: () => 0.5, newId: () => "id" };
const build = (ref: Parameters<typeof ItemBuilder.buildItem>[1], amount?: number) =>
  ({ ...ItemBuilder.buildItem(dice, ref, amount) }) as InventoryItem;
const context = { newId: () => "new" };

const state = (card: InventoryItem, sword: InventoryItem): InventoryState => ({
  inventory: [card, null],
  equipment: { handRight: sword },
  abilities: { 1: null },
  gold: 0,
});

const socket = (from: InventoryState) =>
  moveItem(
    from,
    {
      from: { location: "inventory", slot: 0 },
      to: { location: "equipment", slot: "handRight" },
    },
    context,
  );

describe("socketing a card", () => {
  it("puts its mod in the gear's first empty slot, its stats added, and uses one card", () => {
    const sword = build({ key: "sword", slots: 2 });
    const result = socket(state(build("wolfCard", 3), sword));
    if (!result.moved) throw new Error("refused");
    const socketed = result.state.equipment.handRight as InventoryItem;
    expect(socketed.mods).toEqual(["sharp", null]);
    expect(socketed.stats.maxDamage).toBeGreaterThan(sword.stats.maxDamage);
    expect(result.state.inventory[0]?.amount).toBe(2);
  });

  it("removes the last card of a stack", () => {
    const result = socket(state(build("wolfCard"), build({ key: "sword", slots: 1 })));
    expect(result.moved && result.state.inventory[0]).toBeNull();
  });

  it("refuses gear with no empty slot, or a mod that can't go on it", () => {
    expect(socket(state(build("wolfCard"), build("sword")))).toMatchObject({ moved: false });
    const sturdyOnSword = socket(state(build("crabCard"), build({ key: "sword", slots: 1 })));
    expect(sturdyOnSword).toMatchObject({ moved: false, error: expect.stringContaining("can't") });
  });

  it("never goes in an ability slot", () => {
    const result = moveItem(
      state(build("wolfCard"), build("sword")),
      { from: { location: "inventory", slot: 0 }, to: { location: "abilities", slot: 1 } },
      context,
    );
    expect(result.moved).toBe(false);
  });
});
