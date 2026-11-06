import type { AbilitySlot } from "@/rules/spells";
import type { Player } from "./player";

/** A spell being cast: the server fires it at `landsAt` unless something cancels it first. */
export interface PendingCast {
  abilitySlot: AbilitySlot;
  landsAt: number;
  roomName?: string;
}

/** Whether this ability takes time to cast, rather than firing as soon as it is used. */
export function hasCastTime(player: Player, abilitySlot: AbilitySlot | undefined) {
  return !!player.getAbilityDetails(abilitySlot).stats?.castTime;
}

function emitCancelled(player: Player) {
  if (!player.roomName) return;
  player.world.io.to(player.roomName).emit("playerCastCancelled", { socketId: player.socketId });
}

/** Starts a timed spell. Nothing is paid until it lands, so a cancelled cast costs nothing. */
export function startCast(player: Player, abilitySlot: AbilitySlot) {
  if (player.pendingCast || !player.roomName) return;
  const castMs = player.getAbilityDetails(abilitySlot).stats?.castTime;
  const isReady = castMs && !player.vx && !player.vy && player.canCastSpell(abilitySlot, false);
  /* Only the sender hears a refusal, so spamming a key on cooldown never reaches the room */
  if (!isReady) {
    player.world.io.to(player.socketId).emit("playerCastCancelled", { socketId: player.socketId });
    return;
  }
  player.pendingCast = {
    abilitySlot,
    landsAt: player.world.now() + castMs,
    roomName: player.roomName,
  };
  player.world.io
    .to(player.roomName)
    .emit("playerCastStarted", { socketId: player.socketId, castMs });
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
  const isInterrupted =
    player.state.isDead || player.hasBuff("stun") || player.roomName !== cast.roomName;
  if (isInterrupted) return cancelCast(player);
  if (player.world.now() < cast.landsAt) return;

  player.pendingCast = undefined;
  const { abilitySlot } = cast;
  const castAngle = player.state.lastAngle ?? 0;
  if (!player.doCast({ abilitySlot, castAngle })) return emitCancelled(player);
  if (!player.roomName) return;
  player.world.io
    .to(player.roomName)
    .emit("playerCastLanded", { socketId: player.socketId, abilitySlot, castAngle });
}
