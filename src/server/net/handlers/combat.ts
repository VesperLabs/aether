import type { ParsedCommand } from "@/network";
import type { PlayerAttackRequest, PlayerCastRequest } from "@/server/player";
import type { CommandContext } from "@/server/net/command-context";
import { isInRoom } from "@/server/player-room";
import { grantLungeMove } from "./movement";

export function attack(
  ctx: CommandContext,
  { count, direction, castAngle, abilitySlot }: ParsedCommand<"attack"> = {},
) {
  const { world, socket, socketId } = ctx;
  const player = world.players[socketId];
  if (!isInRoom(player)) return;

  // attack-spells like flame-slash also respect the spell-cooldown...
  if (abilitySlot && !player.canCastSpell(abilitySlot)) return;

  /* The schema lets these be missing; the player treats a missing value as undefined. */
  player.doAttack({ count, direction, castAngle, abilitySlot } as PlayerAttackRequest);

  socket
    .to(player?.roomName)
    .emit("playerAttack", { socketId, count, direction, castAngle, abilitySlot });
}

export function castSpell(
  ctx: CommandContext,
  { abilitySlot, castAngle }: ParsedCommand<"castSpell"> = {},
) {
  const { world, socket, socketId } = ctx;
  const player = world.players[socketId];
  if (!isInRoom(player)) return;
  const lungeAt = player.state.lungeAt;
  player.doCast({ abilitySlot, castAngle } as PlayerCastRequest);
  // A lunge carries the player further than walking; their client moves them through it
  if (player.state.lungeAt !== lungeAt) grantLungeMove(player);
  socket.to(player?.roomName).emit("playerCastSpell", { socketId, abilitySlot, castAngle });
}
