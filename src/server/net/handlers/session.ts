import { getFullCharacterState } from "../../utils";
import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export function latency(ctx: CommandContext, ack: ParsedCommand<"latency">) {
  if (typeof ack === "function") (ack as () => void)();
}

export function peerInit(ctx: CommandContext, pId: ParsedCommand<"peerInit">) {
  const { scene, socketId, io, session } = ctx;
  session.peerId = pId;
  const player = scene.players[socketId];
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
  const { scene, socket, socketId } = ctx;
  const player: ServerPlayer = scene.players[socketId];
  await scene.db.updateUserSetting(player, {
    name,
    value,
  });
  socket.emit("updateUserSetting", { name, value });
}
