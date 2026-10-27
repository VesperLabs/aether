import { calculateStealthVisibilityPercent } from "@/rules/combat";
import { AGGRO_KITE_RANGE, NPC_ATTACK_ADDED_DELAY, NPC_LOSE_AGGRO_MS } from "./constants";
import { checkInRange, distanceBetween, type Body } from "./range";

/** A player as an NPC sees them. */
export interface NpcPlayerView extends Body {
  socketId: string;
  isDead?: boolean;
  stats?: { level?: number } | null;
  /** The player's stealth buff, if they have one. */
  stealthBuff?: { level?: number } | null;
}

export interface NpcSelfView extends Body {
  /** `baseStats.level`: sets how far the NPC notices players. */
  baseLevel?: number;
  stats?: { level?: number } | null;
}

export interface AggroInput {
  npc: NpcSelfView;
  /** The id the NPC is locked on to, if any. */
  lockedPlayerId?: string | null;
  /** The player that id resolves to (null if they left). */
  lockedPlayer?: NpcPlayerView | null;
  /** The player in the NPC's room nearest to it. */
  nearestPlayer?: NpcPlayerView | null;
}

export interface AggroResult {
  isAggro: boolean;
  /** The player to lock on to when aggro. */
  targetId?: string;
}

/** How far an NPC that hasn't noticed anyone yet will notice a player. */
export function calculateNpcAggroRange(baseLevel: number | undefined) {
  return Math.min(10 + (baseLevel as number) * 8, AGGRO_KITE_RANGE);
}

/** Stealthed players are seen from less far, depending on the level gap. */
export function calculateStealthAggroRange(
  npc: NpcSelfView,
  player: NpcPlayerView,
  npcAggroRange: number,
) {
  return (
    npcAggroRange *
    calculateStealthVisibilityPercent({
      distance: distanceBetween(player, npc),
      observer: npc,
      player,
      stealthBuff: player.stealthBuff,
      maxVisibilityRange: npcAggroRange,
    })
  );
}

/** Does the NPC aggro on the player it is locked on to, or else the nearest one? */
export function decideAggro({
  npc,
  lockedPlayerId,
  lockedPlayer,
  nearestPlayer,
}: AggroInput): AggroResult {
  const player = lockedPlayer || nearestPlayer;
  if (!player) return { isAggro: false };

  const npcAggroRange = lockedPlayerId
    ? AGGRO_KITE_RANGE // running away from the NPC
    : calculateNpcAggroRange(npc.baseLevel); // NPC has not aggroed us yet
  if (!checkInRange(npc, player, npcAggroRange)) return { isAggro: false };

  if (player.stealthBuff) {
    const stealthRange = calculateStealthAggroRange(npc, player, npcAggroRange);
    if (!checkInRange(npc, player, stealthRange)) return { isAggro: false };
  }

  return { isAggro: true, targetId: player.socketId };
}

export interface NpcAttackReadyInput {
  attackDelay: number;
  lastAttack: number;
  now: number;
}

/** NPCs attack a fixed 400ms slower than their attack delay. */
export function isNpcAttackReady({ attackDelay, lastAttack, now }: NpcAttackReadyInput) {
  return now - lastAttack > attackDelay + NPC_ATTACK_ADDED_DELAY;
}

/** Still locked on and out of combat for a while? */
export function isStillAggro(
  lockedPlayerId: string | null | undefined,
  lastCombat: number,
  now: number,
) {
  return lockedPlayerId && now - lastCombat > NPC_LOSE_AGGRO_MS;
}
