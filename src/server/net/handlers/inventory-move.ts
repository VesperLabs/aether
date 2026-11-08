import { broadcastPlayerUpdate } from "@/server/net/room-broadcast";
import type { MoveItemCommand } from "@/network";
import { moveItemCommand } from "@/rules/inventory";
import type { CommandContext } from "@/server/net/command-context";
import { findNearbyNpc } from "@/server/net/nearby-keeper";
import { isInRoom } from "@/server/player-room";

export function moveItem(ctx: CommandContext, { to, from }: MoveItemCommand = {}) {
  const { world, actor, socketId } = ctx;
  const player = world?.players?.[socketId];
  if (!isInRoom(player)) return;

  /* Shop moves need the keeper to still be next to the player. */
  const isShopMove = from?.location === "shop" || to?.location === "shop";
  const keeper = findNearbyNpc(world, socketId, player.state?.targetNpcId);
  if (isShopMove && !keeper?.services?.shop) return;
  const npcId = keeper ? player.state.targetNpcId : undefined;
  const shopSlot = keeper?.services?.shop?.[from?.slot as number];
  const result = moveItemCommand(
    player,
    { from, to },
    { shop: { npcId, slot: shopSlot }, newId: world.dice.newId },
  );
  if (!result.ok) {
    if (result.error) actor.emit("message", { type: "error", message: result.error });
    return;
  }

  /* Save the users data */
  player.calculateStats();
  world.db.updateUser(player);
  broadcastPlayerUpdate(ctx.world, player);
}
