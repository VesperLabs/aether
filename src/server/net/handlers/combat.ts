import type { ParsedCommand } from "@/network";
import type { PlayerAttackRequest, PlayerCastRequest } from "@/server/player";
import type { CommandContext } from "@/server/net/command-context";
import { isInRoom } from "@/server/player-room";
import { cancelCast, hasCastTime, startCast as beginCast } from "@/server/player-cast";
import { grantLungeMove } from "./movement";

export function attack(
  ctx: CommandContext,
  { count, direction, castAngle, abilitySlot }: ParsedCommand<"attack"> = {},
) {
  const { world, actor, socketId } = ctx;
  const player = world.players[socketId];
  if (!isInRoom(player)) return;

  cancelCast(player);

  // attack-spells like flame-slash also respect the spell-cooldown...
  if (abilitySlot && !player.canCastSpell(abilitySlot)) return;

  /* The schema lets these be missing; the player treats a missing value as undefined. */
  /* Only a swing that happened is shown to others, or spamming attack would spam the animation */
  if (!player.doAttack({ count, direction, castAngle, abilitySlot } as PlayerAttackRequest)) return;

  actor
    .toOthers(player?.roomName)
    .emit("playerAttack", { socketId, count, direction, castAngle, abilitySlot });
}

export function castSpell(
  ctx: CommandContext,
  { abilitySlot, castAngle }: ParsedCommand<"castSpell"> = {},
) {
  const { world, actor, socketId } = ctx;
  const player = world.players[socketId];
  if (!isInRoom(player)) return;
  /* Timed spells only fire through startCast, and nothing else fires during one */
  if (player.pendingCast || hasCastTime(player, abilitySlot ?? undefined)) return;
  const lungeAt = player.state.lungeAt;
  if (!player.doCast({ abilitySlot, castAngle } as PlayerCastRequest)) return;
  // A lunge carries the player further than walking; their client moves them through it
  if (player.state.lungeAt !== lungeAt) grantLungeMove(player);
  actor.toOthers(player?.roomName).emit("playerCastSpell", { socketId, abilitySlot, castAngle });
}

export function startCast(ctx: CommandContext, { abilitySlot }: ParsedCommand<"startCast">) {
  const player = ctx.world.players[ctx.socketId];
  if (isInRoom(player)) beginCast(player, abilitySlot);
}

export function cancelCastCommand(ctx: CommandContext) {
  const player = ctx.world.players[ctx.socketId];
  if (isInRoom(player)) cancelCast(player);
}
