import type { ServerCharacter } from "./character";
import { findCharacter } from "./find-character";
import type { Npc } from "./npc";
import { getRoomIndex } from "./room-index";
import { hasLineOfSight } from "@/rules/movement";
import {
  AGGRO_KITE_RANGE,
  isNpcAggressive,
  shootsOverWalls,
  type NpcBehaviorInput,
  type NpcPlayerView,
} from "@/rules/npc-behavior";

/** What the behavior rules need to know about a target, a player or an NPC. */
const toPlayerView = (target: ServerCharacter | undefined): NpcPlayerView | null =>
  target
    ? {
        socketId: target.socketId || target.id,
        x: target.x,
        y: target.y,
        bodySize: target.bodySize,
        isDead: target.state?.isDead,
        stats: target.stats,
        stealthBuff: target.getBuff("stealth"),
      }
    : null;

/**
 * The foe nearest an NPC that it would attack on sight. Wild NPCs go for players and companions;
 * companions never pick fights, they only answer them (through threat).
 */
function nearestFoe(npc: Npc): ServerCharacter | undefined {
  if (npc.state.ownerId) return;
  const index = getRoomIndex(npc.world, npc.room.name);
  const player = index.players.nearest(npc);
  const pet = index.npcs.near(npc, AGGRO_KITE_RANGE).find((other) => other.state.ownerId);
  if (!pet) return player;
  if (!player) return pet;
  const distance = (c: ServerCharacter) => Math.hypot(c.x - npc.x, c.y - npc.y);
  return distance(pet) < distance(player) ? pet : player;
}

/** Copies what the NPC behavior rules read from a legacy `Npc` into plain data. */
export function buildNpcBehaviorInput(
  npc: Npc,
  frame: { time: number; delta: number; now: number },
): NpcBehaviorInput {
  const { state, world, room } = npc;
  const lockedPlayer = toPlayerView(findCharacter(world, state?.lockedPlayerId));
  const nearestPlayer = isNpcAggressive(npc) || lockedPlayer ? toPlayerView(nearestFoe(npc)) : null;
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
      home: npc.home(),
      hasTalkers: npc.talkingIds?.length > 0,
      abilities: npc.abilities,
      buffs: npc.buffs,
      behaviors: npc.behaviors,
      windupMs: npc.windupMs,
      weapons: {
        handLeft: npc.hasRangedWeaponLeft() ? { range: npc.getWeaponRange("handLeft") } : null,
        handRight: npc.hasRangedWeaponRight() ? { range: npc.getWeaponRange("handRight") } : null,
        meleeReach: npc.getWeaponRange(
          npc.hasMeleeWeaponRight() && !npc.hasMeleeWeaponLeft() ? "handRight" : "handLeft",
        ),
      },
    },
    state,
    isStunned: npc.hasBuff("stun"),
    isWindupTargeted: !!npc.windup.targetId,
    lockedPlayer,
    nearestPlayer,
    threatTarget: toPlayerView(findCharacter(world, npc.threatTargetId())),
    leader: npc.findLeader(),
    hasClearShot: shootsOverWalls(npc)
      ? undefined
      : (target) => hasLineOfSight(room.map.grid, npc, target),
    isNearCollideTile: npc.isNearCollideTile(),
    isOutOfBounds: npc.isOutOfBounds(),
  };
}
