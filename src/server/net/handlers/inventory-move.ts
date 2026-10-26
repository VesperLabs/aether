import crypto from "crypto";
import { getFullCharacterState } from "../../utils";
import { moveItem as moveItemRule } from "@/shared/rules/inventory";
import { applyInventoryState, toInventoryState } from "../../player-inventory";
import type { CommandContext } from "@/server/net/command-context";

/** The validated payload, loosened because the item code still works on untyped slots. */
// oxlint-disable-next-line typescript/no-explicit-any
type MoveItemPayload = { to?: any; from?: any };

export function moveItem(ctx: CommandContext, { to, from }: MoveItemPayload = {}) {
  const { scene, socket, socketId, io } = ctx;
  const player = scene?.players?.[socketId];
  if (!player) return;

  const npcId = player.state?.targetNpcId;
  const shopSlot = scene?.npcs?.[npcId]?.keeperData?.shop?.[from?.slot];
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
  scene.db.updateUser(player);
  io.to(player.roomName).emit("playerUpdate", getFullCharacterState(player));
}
