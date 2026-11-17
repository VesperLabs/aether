import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import { releaseCompanion as release, toggleCompanion as toggle } from "@/server/kept-companions";
import { isInRoom } from "@/server/player-room";

/** Brings one of your caught companions out, or puts it away (the Social menu's Companions tab). */
export function toggleCompanion(ctx: CommandContext, { id }: ParsedCommand<"toggleCompanion">) {
  const player = ctx.world.players[ctx.socketId];
  if (!isInRoom(player) || player.state.isDead) return;
  toggle(ctx.world, player, id);
}

/** Lets one of your caught companions go for good (dropped on the ground from its slot). */
export function releaseCompanion(ctx: CommandContext, { id }: ParsedCommand<"releaseCompanion">) {
  const player = ctx.world.players[ctx.socketId];
  if (!isInRoom(player)) return;
  release(ctx.world, player, id);
}
