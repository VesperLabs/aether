import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export function attack(
  ctx: CommandContext,
  { count, direction, castAngle, abilitySlot }: ParsedCommand<"attack"> = {},
) {
  const { scene, socket, socketId } = ctx;
  const player = scene.players[socketId];

  // attack-spells like flame-slash also respect the spell-cooldown...
  if (abilitySlot && !player.canCastSpell(abilitySlot as number)) return;

  player.doAttack({ count, direction, castAngle, abilitySlot });

  socket
    .to(player?.roomName)
    .emit("playerAttack", { socketId, count, direction, castAngle, abilitySlot });
}

export function castSpell(
  ctx: CommandContext,
  { abilitySlot, castAngle }: ParsedCommand<"castSpell"> = {},
) {
  const { scene, socket, socketId } = ctx;
  const player = scene.players[socketId];
  player.doCast({ abilitySlot, castAngle });
  socket.to(player?.roomName).emit("playerCastSpell", { socketId, abilitySlot, castAngle });
}
