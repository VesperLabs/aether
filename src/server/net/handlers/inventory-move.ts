import crypto from "crypto";
import type { MoveItemCommand } from "@/shared/network";
import { getFullCharacterState } from "@/shared/network/sync";
import { moveItem as moveItemRule } from "@/shared/rules/inventory";
import { applyInventoryState, toInventoryState } from "../../player-inventory";
import type { CommandContext } from "@/server/net/command-context";

export function moveItem(ctx: CommandContext, { to, from }: MoveItemCommand = {}) {
  const { world, socket, socketId, io } = ctx;
  const player = world?.players?.[socketId];
  if (!player) return;

  const npcId = player.state?.targetNpcId;
  const shopSlot = world?.npcs?.[npcId]?.keeperData?.shop?.[from?.slot as number];
  const result = moveItemRule(
    toInventoryState(player),
    { from, to },
    { shop: { npcId, slot: shopSlot }, newId: () => crypto.randomUUID() },
  );
  if (result.moved === false) {
    if (result.error) socket.emit("message", { type: "error", message: result.error });
    return;
  }
  applyInventoryState(player, result.state);

  /* Save the users data */
  player.calculateStats();
  world.db.updateUser(player);
  io.to(player.roomName).emit("playerUpdate", getFullCharacterState(player));
}
