import type { ParsedCommand } from "@/shared/network";
import type { PlayerAttackRequest, PlayerCastRequest } from "@/server/player";
import type { CommandContext } from "@/server/net/command-context";
import { isInRoom } from "@/server/player-room";

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
  player.doCast({ abilitySlot, castAngle } as PlayerCastRequest);
  socket.to(player?.roomName).emit("playerCastSpell", { socketId, abilitySlot, castAngle });
}
