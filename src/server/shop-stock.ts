import type { GameIo } from "@/network";
import { dayAt } from "@/rules/seasons";
import { buildShop, type ShopSlot } from "./npc-build";
import type { Npc } from "./npc";
import type { ServerWorld } from "./server-world";

/** Fills the keeper's shelves anew, with freshly rolled gear, once a new game day has started. */
export function restockIfNewDay(world: ServerWorld, npc: Npc) {
  const today = dayAt(world.now(), world.calendar);
  if (!npc.shopEntries || npc.shopStockedOn === today) return;
  npc.shopStockedOn = today;
  npc.services.shop = buildShop(world.dice, npc.shopEntries);
}

/** Takes `amount` off a shelf slot; an empty one shows nothing until the next restock. */
export function takeStock(slot: ShopSlot, amount: number) {
  slot.stock = Math.max(0, slot.stock - amount);
  if (slot.stock === 0) slot.item = null;
}

/** Sends the keeper's shelves to everyone talking to it, so they see what sold or restocked. */
export function sendShopToTalkers(io: GameIo, npc: Npc) {
  for (const id of npc.talkingIds) {
    io.to(id).emit("npcShop", { npcId: npc.id, shop: npc.services.shop });
  }
}
