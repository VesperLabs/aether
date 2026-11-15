import { describe, expect, it } from "vitest";
import { createCalendar } from "@/rules/seasons";
import { restockIfNewDay, takeStock } from "./shop-stock";
import type { Npc } from "./npc";
import type { ServerWorld } from "./server-world";

const DAY = 2 * 60 * 60 * 1000;

function keeper() {
  let ids = 0;
  let now = 0;
  const world = {
    now: () => now,
    calendar: createCalendar(),
    dice: { random: () => 0.5, newId: () => `id${ids++}` },
  } as unknown as ServerWorld;
  const npc = {
    shopEntries: [
      { item: "clothPants", stock: 1 },
      { item: "smallHpPotion", stock: 20 },
    ],
    services: { shop: [] },
  } as unknown as Npc;
  return { world, npc, advance: (ms: number) => (now += ms) };
}

describe("shop stock", () => {
  it("stocks once per game day, however many players open it", () => {
    const { world, npc, advance } = keeper();
    restockIfNewDay(world, npc);
    const shelves = npc.services.shop;
    expect(shelves.map((s: { stock: number }) => s.stock)).toEqual([1, 20]);
    takeStock(shelves[0], 1);
    restockIfNewDay(world, npc);
    expect(npc.services.shop).toBe(shelves);
    expect(shelves[0].item).toBeNull();
    advance(DAY);
    restockIfNewDay(world, npc);
    expect(npc.services.shop[0].item?.key).toBe("clothPants");
  });
});
