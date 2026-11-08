import { getAbilityCosts, hasStaminaFor } from "@/rules/combat";
import { canThrow, getThrowFlight, isThrowable } from "@/rules/capture";
import { takeOneItemCommand } from "@/rules/inventory";
import { entitiesInRoom } from "@/rules/world";
import type { ParsedCommand } from "@/network";
import { throwBall } from "@/server/balls";
import { canTame } from "@/server/companions";
import type { CommandContext } from "@/server/net/command-context";
import { broadcastPlayerUpdate } from "@/server/net/room-broadcast";
import { isInRoom } from "@/server/player-room";

/**
 * Throws a ball along `angle`: it uses up one ball and some stamina, and the ball goes into the
 * world (`balls.ts`), which decides the catch once it lands and the creature has struggled.
 */
export function throwItem(
  ctx: CommandContext,
  { location, item, angle }: ParsedCommand<"throwItem">,
) {
  const { world, socketId } = ctx;
  const player = world.players[socketId];
  if (!isInRoom(player) || player.state.isDead || player.hasBuff("stun")) return;
  const now = world.now();
  if (!canThrow(player.lastThrowAt, now)) return;

  /* A ball costs the stamina on it, as a spell does */
  const ball = takeOneItemCommand(
    player,
    { location, item },
    (it) => isThrowable(it.base) && hasStaminaFor(player.stats?.sp, getAbilityCosts(it.stats).sp),
  );
  if (!ball) return;
  const spCost = getAbilityCosts(ball.stats).sp;
  player.lastThrowAt = now;
  player.state.lastAngle = angle;
  player.modifyStat("sp", -spCost);
  world.io.to(player.roomName).emit("modifyPlayerStat", {
    socketId,
    type: "sp",
    amount: -spCost,
  });

  const from = { x: player.x, y: player.y + player.bodyCenterY };
  /* Only a creature nobody owns and nobody else's ball is on can be hit */
  const struggling = new Set(Object.values(world.balls).map((b) => b.target?.id));
  const wild = entitiesInRoom(world.npcs, player.roomName).filter(
    (npc) => canTame(npc) && !struggling.has(npc.id),
  );
  throwBall(world, {
    room: player.room,
    throwerId: socketId,
    texture: ball.texture as string,
    from,
    flight: getThrowFlight(from, angle, wild),
  });
  world.db.updateUser(player);
  broadcastPlayerUpdate(world, player);
}
