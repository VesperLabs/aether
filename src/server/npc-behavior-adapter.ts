import type { NpcBehaviorInput, NpcPlayerView } from "@/shared/rules/npc-behavior";

/** What the behavior rules need to know about a player. */
const toPlayerView = (player: any): NpcPlayerView | null =>
  player
    ? {
        socketId: player.socketId,
        x: player.x,
        y: player.y,
        bodySize: player.bodySize,
        isDead: player.state?.isDead,
        stats: player.stats,
        stealthBuff: player.getBuff("stealth"),
      }
    : null;

/** Copies what the NPC behavior rules read from a legacy `Npc` into plain data. */
export function buildNpcBehaviorInput(npc: any, time: number, delta: number): NpcBehaviorInput {
  const { state, scene, room } = npc;
  const lockedPlayer = toPlayerView(scene?.players?.[state?.lockedPlayerId]);
  const nearestPlayer =
    state?.isAggro || lockedPlayer
      ? toPlayerView(room?.playerManager?.getNearestPlayer(npc))
      : null;
  return {
    now: Date.now(),
    time,
    delta,
    npc: {
      x: npc.x,
      y: npc.y,
      bodySize: npc.bodySize,
      baseLevel: npc.baseStats?.level,
      stats: npc.stats,
      startingCoords: npc.startingCoords,
      hasTalkers: npc.talkingIds?.length > 0,
      abilities: npc.abilities,
      buffs: npc.buffs,
      weapons: {
        handLeft: npc.hasRangedWeaponLeft() ? { range: npc.getWeaponRange("handLeft") } : null,
        handRight: npc.hasRangedWeaponRight() ? { range: npc.getWeaponRange("handRight") } : null,
      },
    },
    state,
    isStunned: npc.hasBuff("stun"),
    lockedPlayer,
    nearestPlayer,
    isNearCollideTile: npc.isNearCollideTile(),
    isOutOfBounds: npc.isOutOfBounds(),
  };
}
