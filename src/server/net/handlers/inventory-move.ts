import { broadcastPlayerUpdate } from "@/server/net/room-broadcast";
import type { MoveItemCommand } from "@/network";
import { moveItemCommand } from "@/rules/inventory";
import type { CommandContext } from "@/server/net/command-context";
import { findNearbyNpc } from "@/server/net/nearby-keeper";
import { isInRoom } from "@/server/player-room";
import type { ShopSlot } from "@/server/npc-build";
import { restockIfNewDay, sendShopToTalkers, takeStock } from "@/server/shop-stock";

export function moveItem(ctx: CommandContext, { to, from }: MoveItemCommand = {}) {
  const { world, actor, socketId } = ctx;
  const player = world?.players?.[socketId];
  if (!isInRoom(player)) return;

  /* Shop moves need the keeper to still be next to the player. */
  const isShopMove = from?.location === "shop" || to?.location === "shop";
  const keeper = findNearbyNpc(world, socketId, player.state?.targetNpcId);
  if (isShopMove && !keeper?.services?.shop) return;
  if (keeper) restockIfNewDay(world, keeper);
  const npcId = keeper ? player.state.targetNpcId : undefined;
  const shopSlot: ShopSlot | undefined =
    from?.location === "shop" ? keeper?.services?.shop?.[from?.slot as number] : undefined;
  const goldBefore = player.gold;
  const result = moveItemCommand(
    player,
    { from, to },
    { shop: { npcId, slot: shopSlot }, newId: world.dice.newId },
  );
  if (!result.ok) {
    if (result.error) actor.emit("message", { type: "error", message: result.error });
    return;
  }

  /* A purchase takes it off the shelf: gear sells once, stackables count down to their daily limit */
  if (keeper && shopSlot?.item && player.gold < goldBefore) {
    const isStackable = shopSlot.item.type === "stackable";
    takeStock(shopSlot, isStackable ? Math.abs(parseInt(String(from?.amount))) || 1 : 1);
    sendShopToTalkers(ctx.io, keeper);
  }

  /* Save the users data */
  player.calculateStats();
  world.db.updateUser(player);
  broadcastPlayerUpdate(ctx.world, player);
}
