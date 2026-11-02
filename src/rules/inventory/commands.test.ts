import { describe, expect, it } from "vitest";
import { consumeItemCommand, dropItemCommand, dropPosition } from ".";
import type { InventoryHolder } from ".";

const holder = (): InventoryHolder => ({
  inventory: [
    {
      id: "hp1",
      base: "hpPotion",
      slot: "stackable",
      type: "stackable",
      amount: 2,
      effects: { hp: 50 },
    },
  ],
  equipment: {},
  abilities: {},
  gold: 0,
});

describe("inventory commands", () => {
  it("stores a drop back on the player", () => {
    const player = holder();
    const result = dropItemCommand(player, {
      location: "inventory",
      item: { id: "hp1" },
      amount: 2,
    });
    expect(result.ok).toBe(true);
    expect(player.inventory.filter(Boolean)).toHaveLength(0);
  });

  it("leaves the player alone when refused", () => {
    const player = holder();
    const before = player.inventory;
    expect(dropItemCommand(player, { location: "inventory", item: { id: "nope" } }).ok).toBe(false);
    expect(player.inventory).toBe(before);
  });

  it("uses up one consumable", () => {
    const player = holder();
    const result = consumeItemCommand(player, { location: "inventory", item: { id: "hp1" } });
    expect(result.consumed).toBe(true);
    expect(player.inventory[0]?.amount).toBe(1);
  });

  it("drops one step in front", () => {
    expect(dropPosition({ x: 0, y: 0, direction: "left" })).toEqual({ x: -16, y: 0 });
  });
});
