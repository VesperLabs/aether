import type { Player } from "../../player";
import { getFullCharacterState } from "@/network/sync";
import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";

export function latency(ctx: CommandContext, ack: ParsedCommand<"latency">) {
  if (typeof ack === "function") (ack as () => void)();
}

export function peerInit(ctx: CommandContext, pId: ParsedCommand<"peerInit">) {
  const { world, socketId, io, session } = ctx;
  session.peerId = pId;
  const player = world.players[socketId];
  if (player) {
    player.peerId = pId;
    const roomName = player.room?.name;
    if (roomName) {
      io.to(roomName).emit("playerUpdate", getFullCharacterState(player));
    }
  }
}

export function peerConnect(
  ctx: CommandContext,
  { peerId, socketId }: ParsedCommand<"peerConnect">,
) {
  const { socket } = ctx;
  socket.to(socketId).emit("connectPeer", { peerId, socketId });
}

export async function updateUserSetting(
  ctx: CommandContext,
  { name, value }: ParsedCommand<"updateUserSetting">,
) {
  const { world, socket, socketId } = ctx;
  const player: Player = world.players[socketId];
  await world.db.updateUserSetting(player, {
    name,
    value,
  });
  socket.emit("updateUserSetting", { name, value });
}
