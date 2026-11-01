import type { Npc } from "./npc";
import type { Player } from "./player";
import { getRoomIndex } from "./room-index";
import type { NpcBehaviorInput, NpcPlayerView } from "@/rules/npc-behavior";

/** What the behavior rules need to know about a player. */
const toPlayerView = (player: Player | undefined): NpcPlayerView | null =>
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
export function buildNpcBehaviorInput(
  npc: Npc,
  frame: { time: number; delta: number; now: number },
): NpcBehaviorInput {
  const { state, world, room } = npc;
  const lockedPlayer = toPlayerView(world?.players?.[state?.lockedPlayerId as string]);
  const nearestPlayer =
    state?.isAggro || lockedPlayer
      ? toPlayerView(getRoomIndex(world, room.name).players.nearest(npc))
      : null;
  return {
    now: frame.now,
    time: frame.time,
    delta: frame.delta,
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
