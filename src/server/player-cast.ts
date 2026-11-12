import { beginCast, getCastFacing, stepCast, type PendingCast } from "@/rules/combat";
import type { AbilitySlot } from "@/rules/spells";
import type { Player } from "./player";

export type PlayerCast = PendingCast<AbilitySlot>;

/** Whether this ability takes time to cast, rather than firing as soon as it is used. */
export function hasCastTime(player: Player, abilitySlot: AbilitySlot | undefined) {
  return !!player.getAbilityDetails(abilitySlot).stats?.castTime;
}

/** Only the sender hears it, so a client waiting on a cast it won't get is freed without telling the room. */
export function emitCastRefused(player: Player) {
  player.world.io.to(player.socketId).emit("playerCastCancelled", { socketId: player.socketId });
}

function emitCancelled(player: Player) {
  if (!player.roomName) return;
  player.world.io.to(player.roomName).emit("playerCastCancelled", { socketId: player.socketId });
}

/** Mid-cast the body faces the aim: the server sets it, so everyone sees the same caster. */
export function faceCastAim(player: Player) {
  if (player.pendingCast) player.direction = getCastFacing(player.state.lastAngle ?? 0);
}

/** Starts a timed spell. Nothing is paid until it lands, so a cancelled cast costs nothing. */
export function startCast(player: Player, abilitySlot: AbilitySlot) {
  const cast = beginCast(
    abilitySlot,
    {
      isCasting: !!player.pendingCast,
      isMoving: !!(player.vx || player.vy),
      canAfford: !!player.canCastSpell(abilitySlot, false),
      roomName: player.roomName ?? undefined,
      castMs: player.getAbilityDetails(abilitySlot).stats?.castTime,
    },
    player.world.now(),
  );
  /* The client rooted itself when it asked, so every refusal answers it or it stays stuck */
  if (!cast?.roomName) return emitCastRefused(player);
  player.pendingCast = cast;
  faceCastAim(player);
  player.world.io.to(cast.roomName).emit("playerCastStarted", {
    socketId: player.socketId,
    castMs: cast.landsAt - player.world.now(),
  });
}

/** Calls off the cast in progress, if there is one. */
export function cancelCast(player: Player) {
  if (!player.pendingCast) return;
  player.pendingCast = undefined;
  emitCancelled(player);
}

/** Each tick: a stun, death or a room change cancels the cast; otherwise it may land. */
export function updateCast(player: Player) {
  const cast = player.pendingCast;
  if (!cast) return;
  const step = stepCast(
    cast,
    {
      isDead: player.state.isDead,
      isStunned: player.hasBuff("stun"),
      roomName: player.roomName ?? undefined,
    },
    player.world.now(),
  );
  if (step === "cancel") return cancelCast(player);
  if (step === "wait") return;

  player.pendingCast = undefined;
  const { abilitySlot } = cast;
  const castAngle = player.state.lastAngle ?? 0;
  if (!player.doCast({ abilitySlot, castAngle })) return emitCancelled(player);
  if (!player.roomName) return;
  player.world.io
    .to(player.roomName)
    .emit("playerCastLanded", { socketId: player.socketId, abilitySlot, castAngle });
}
