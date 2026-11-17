import { getAbilityCosts, hasStaminaFor } from "@/rules/combat";
import { isThrowable } from "@/rules/capture";
import { takeOneItemCommand } from "@/rules/inventory";
import { checkCastReady, getSpell } from "@/rules/spells";
import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import { broadcastPlayerUpdate } from "@/server/net/room-broadcast";
import { isInRoom } from "@/server/player-room";
import { createSpell } from "@/server/spell-adapter";

/**
 * Throws an item (a pokeball) along `angle`. Throwing is the item's own: it uses one up and some
 * stamina. Once thrown it is the spell of the same name, carrying the item's buffs: a ball puts
 * `capturing` on what it hits, and that debuff decides the catch when it runs out (`server/capture`).
 */
export function throwItem(
  ctx: CommandContext,
  { location, item, angle }: ParsedCommand<"throwItem">,
) {
  const { world, socketId } = ctx;
  const player = world.players[socketId];
  if (!isInRoom(player)) return;
  /* Thrown or refused, the ball leaves the hand */
  player.state.aimingBall = null;
  if (player.state.isDead || player.hasBuff("stun")) return;
  const now = world.now();
  const { lastCast } = player.state;

  const ball = takeOneItemCommand(
    player,
    { location, item },
    (it) =>
      isThrowable(it.base) &&
      checkCastReady({ spellName: it.base, lastCast, castDelay: 0, now }) &&
      hasStaminaFor(player.stats?.sp, getAbilityCosts(it.stats).sp),
  );
  if (!ball) return;
  const spellName = ball.base as string;
  lastCast[spellName] = now;
  player.state.lastAngle = angle;
  player.modifyStatIfCostExists("sp", getAbilityCosts(ball.stats).sp ?? 0);

  const spell = createSpell(player.room, {
    caster: player,
    spellName,
    castAngle: angle,
    ability: { ...ball, spellName, spell: getSpell(spellName) },
  });
  const effect = spell.toEffect(now);
  if (effect) world.io.to(player.roomName).emit("effectStarted", effect);
  world.db.updateUser(player);
  broadcastPlayerUpdate(world, player);
}
