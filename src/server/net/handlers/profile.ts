import { getFullCharacterState } from "@/network/sync";
import { stepAppearance } from "@/rules/character";
import type { ParsedCommand } from "@/network/commands";
import type { CommandContext } from "@/server/net/command-context";
import { isInRoom } from "@/server/world/player-room";

export function updateProfile(ctx: CommandContext, args: ParsedCommand<"updateProfile">) {
  const { world, socketId, io } = ctx;
  const player = world?.players?.[socketId];
  if (!isInRoom(player)) return;

  if (args?.userName) player.profile.userName = args.userName.substring(0, 16);
  Object.assign(player.profile, stepAppearance(player.profile, args ?? {}));

  /* Save the user's data */
  world.db.updateUser(player);
  io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
}
