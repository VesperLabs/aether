import type { ServerCharacter } from "./character";
import { findCharacter } from "./find-character";
import type { Npc } from "./npc";
import { getRoomIndex } from "./room-index";
import { getBody } from "@/content";
import { hasClearWalk, hasLineOfSight, isOutOfMap } from "@/rules/movement";
import {
  AGGRO_KITE_RANGE,
  isNpcAggressive,
  isNpcSkittish,
  shootsOverWalls,
  type NpcBehaviorInput,
  type NpcNextSwing,
  type NpcPlayerView,
} from "@/rules/npc-behavior";

/**
 * The melee swing an NPC throws next, when its body has the swinging hand placed: the hand `doAttack` picks
 * (it alternates when both hold weapons), and what `planSwing` needs to sweep it.
 */
function getNextSwing(npc: Npc): NpcNextSwing | undefined {
  const race = npc.profile?.race;
  const count = npc.action === "attack_right" && npc.hasWeaponLeft() ? 2 : 1;
  const { action } = npc.getAttackActionName({ count });
  if (action !== "attack_right" && action !== "attack_left") return;
  const hand = action === "attack_left" ? "handLeft" : "handRight";
  if (!getBody(race)[hand]) return;
  const isMelee = hand === "handLeft" ? npc.hasMeleeWeaponLeft() : npc.hasMeleeWeaponRight();
  if (!isMelee) return;
  const held = npc.visibleEquipment?.[hand];
  return {
    race: race as string,
    action,
    reach: npc.getWeaponRange(hand),
    hasWeaponRange: !!held?.stats?.range,
    isUppercut: held?.base === "fist",
    bodyCenterY: npc.bodyCenterY,
    scale: npc.profile?.scale ?? 1,
  };
}

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
 * The foe nearest an NPC that it would attack on sight. Wild NPCs go for players and owned NPCs;
 * owned NPCs never pick fights, they only answer them (through threat).
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
  const watches = isNpcAggressive(npc) || isNpcSkittish(npc) || lockedPlayer;
  const nearestPlayer = watches ? toPlayerView(nearestFoe(npc)) : null;
  return {
    now: frame.now,
    time: frame.time,
    delta: frame.delta,
    npc: {
      x: npc.x,
      y: npc.y,
      vx: npc.vx,
      vy: npc.vy,
      bodySize: npc.bodySize,
      baseLevel: npc.baseStats?.level,
      stats: npc.stats,
      startingCoords: npc.startingCoords,
      home: npc.home(),
      /* The latest to start talking: the one it turns to */
      talker: world?.players?.[npc.talkingIds?.at(-1) ?? ""] ?? null,
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
        swing: getNextSwing(npc),
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
    canTravel: (to) => {
      const map = npc.movementMap();
      return !isOutOfMap(map, to.x, to.y) && hasClearWalk(map.grid, npc, to, npc.bodySize);
    },
    isNearCollideTile: npc.isNearCollideTile(),
    isOutOfBounds: npc.isOutOfBounds(),
  };
}
