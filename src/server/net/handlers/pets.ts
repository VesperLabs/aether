import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import { movePetSlot, releasePet as release, swapPet as swap } from "@/server/pets";
import { isInRoom } from "@/server/player-room";

/** The player sending a pet command, if they are in a room and alive. */
const livingPlayer = (ctx: CommandContext) => {
  const player = ctx.world.players[ctx.socketId];
  return isInRoom(player) && !player.state.isDead ? player : undefined;
};

/** Moves one of your pets between slots (dragged in the Pets & Abilities menu). */
export function movePet(ctx: CommandContext, { from, to }: ParsedCommand<"movePet">) {
  const player = livingPlayer(ctx);
  if (player) movePetSlot(ctx.world, player, from, to);
}

/** Swaps one of your pets in or out of the active slot (double-clicked). */
export function swapPet(ctx: CommandContext, { slot }: ParsedCommand<"swapPet">) {
  const player = livingPlayer(ctx);
  if (player) swap(ctx.world, player, slot);
}

/** Lets one of your pets go for good (dropped on the ground from its slot). */
export function releasePet(ctx: CommandContext, { slot }: ParsedCommand<"releasePet">) {
  const player = ctx.world.players[ctx.socketId];
  if (isInRoom(player)) release(ctx.world, player, slot);
}
