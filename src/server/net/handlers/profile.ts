import { broadcastPlayerUpdate } from "@/server/net/room-broadcast";
import { cleanUserName, stepAppearance } from "@/rules/character";
import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import { isInRoom } from "@/server/player-room";

export function updateProfile(ctx: CommandContext, args: ParsedCommand<"updateProfile">) {
  const { world, socketId } = ctx;
  const player = world?.players?.[socketId];
  if (!isInRoom(player)) return;

  const userName = cleanUserName(args?.userName ?? "");
  if (userName) player.profile.userName = userName;
  Object.assign(player.profile, stepAppearance(player.profile, args ?? {}));

  /* Save the user's data */
  world.db.updateUser(player);
  broadcastPlayerUpdate(ctx.world, player);
}
