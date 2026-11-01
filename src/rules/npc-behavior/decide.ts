import type { ActiveBuff } from "@/rules/buffs";
import { isRespawnDue } from "@/rules/combat";
import { checkCastReady, type LastCast } from "@/rules/spells";
import { getCharacterDirection, type CardinalDirection } from "@/rules/world";
import { findSuitableAbility, type NpcAbility } from "./abilities";
import { decideAggro, isNpcAttackReady, type NpcPlayerView, type NpcSelfView } from "./aggro";
import { NPC_WARNING_DELAY } from "./constants";
import { checkInRange, getShouldAttackRange } from "./range";
import type { Body, NpcWeaponRanges } from "./range";
import type { Rng } from "@/rules/world";
import {
  DEFAULT_NPC_BEHAVIORS,
  NPC_BEHAVIORS,
  type BehaviorContext,
  type NpcBehavior,
  type NpcBehaviorId,
} from "./behaviors";
import { chooseBehavior } from "./brain";
import type { WanderStep } from "./wander";

export interface NpcBehaviorInput {
  /** Wall clock (ms). */
  now: number;
  /** Scene time, which paces wandering. */
  time: number;
  /** Milliseconds since the last tick. */
  delta: number;
  npc: NpcSelfView & {
    stats?: { level?: number; walkSpeed?: number; attackDelay?: number; castDelay?: number } | null;
    startingCoords: Body;
    hasTalkers: boolean;
    abilities: Record<string, NpcAbility | null | undefined>;
    buffs: ActiveBuff[];
    weapons: NpcWeaponRanges;
    /** What this NPC can do, best first on ties. Defaults to `DEFAULT_NPC_BEHAVIORS`. */
    behaviors?: readonly NpcBehaviorId[];
  };
  state: {
    isAggro?: boolean;
    isStatic?: boolean;
    walkRange?: number;
    isDead?: boolean;
    isAiming?: boolean;
    isAttacking?: boolean;
    npcAttackReady?: boolean;
    lastAttack: number;
    lockedPlayerId?: string | null;
    lastCast: LastCast;
    /** Loop time of the next wander direction change. */
    nextWanderAt?: number;
  };
  isStunned: boolean;
  /** The player `lockedPlayerId` points at, if they are still around. */
  lockedPlayer?: NpcPlayerView | null;
  /** The player in the NPC's room nearest to it. Needed when aggro or locked on. */
  nearestPlayer?: NpcPlayerView | null;
  /** Is the NPC next to a collision tile (so it should path)? */
  isNearCollideTile: boolean;
  /** Is the NPC outside the map or inside a collision tile? */
  isOutOfBounds: boolean;
}

export type NpcMovement =
  | { type: "standStill" }
  /** Move toward the target player, pathing around obstacles if `pathed`. */
  | { type: "chase"; pathed: boolean }
  | { type: "returnToSpawn"; pathed: boolean }
  /** Stand at spawn, facing down after `faceDownAfterMs`, or walk back there. */
  | { type: "waitAtSpawn"; faceDownAfterMs: number }
  | { type: "talk" }
  | ({ type: "wander" } & WanderStep);

export type NpcAction =
  | { type: "idle" }
  /** Wind up for `windupMs`, then swing. */
  | {
      type: "attack";
      direction: CardinalDirection;
      castAngle: number;
      windupMs: number;
    }
  | { type: "cast"; abilitySlot: string; ability: NpcAbility; windupMs: number };

export interface NpcDecision {
  /** What the NPC is locked on to after this tick. */
  lockedPlayerId: string | null | undefined;
  /** It switched to a new target: restart the attack timer. */
  resetAttackTimer: boolean;
  npcAttackReady: boolean | undefined;
  isAttacking: boolean | undefined;
  /** `undefined` leaves the bubble as it is. */
  bubbleMessage: string | null | undefined;
  /** Chasing a player breaks their stealth. */
  expireStealthOfPlayerId?: string;
  /** The player the NPC acted against this tick, as resolved before it moved. */
  targetPlayerId?: string;
  movement: NpcMovement;
  action: NpcAction;
}

/** A dead mob comes back once its respawn time has passed. */
export function shouldRespawn(input: { deadTime: number; respawnTime: number; now: number }) {
  return isRespawnDue(input);
}

/**
 * One tick of NPC behavior: who it targets, where it moves and whether it attacks or casts.
 * Movement comes from the highest-scoring behavior (see `behaviors.ts`); targeting and the attack
 * timer are tracked as they change along the way, and the final values returned for the caller.
 */
export function decideNpcAction(input: NpcBehaviorInput, rng: Rng): NpcDecision {
  const { npc, state, now } = input;
  const attackDelay = npc.stats?.attackDelay as number;

  let npcAttackReady = state.npcAttackReady;
  let isAttacking = state.isAttacking;
  let lockedPlayerId = state.lockedPlayerId;
  let resetAttackTimer = false;
  let bubbleMessage: string | null | undefined;
  let expireStealthOfPlayerId: string | undefined;

  const idle: NpcAction = { type: "idle" };
  const result = (movement: NpcMovement, action: NpcAction = idle): NpcDecision => ({
    lockedPlayerId,
    resetAttackTimer,
    npcAttackReady,
    isAttacking,
    bubbleMessage,
    expireStealthOfPlayerId,
    targetPlayerId: targetPlayer?.socketId,
    movement,
    action,
  });

  const setLockedPlayerId = (id: string | null | undefined) => {
    // If they are switching targets
    if (lockedPlayerId !== id && id) {
      resetAttackTimer = true;
      npcAttackReady = false;
    }
    lockedPlayerId = id;
  };
  const resolvePlayer = (id: string | null | undefined) => {
    if (id && id === state.lockedPlayerId) return input.lockedPlayer ?? null;
    if (id && id === input.nearestPlayer?.socketId) return input.nearestPlayer;
    return null;
  };
  const handleAggroState = () => {
    const aggro = decideAggro({
      npc,
      lockedPlayerId,
      lockedPlayer: resolvePlayer(lockedPlayerId),
      nearestPlayer: input.nearestPlayer,
    });
    if (aggro.isAggro) setLockedPlayerId(aggro.targetId);
    return aggro.isAggro;
  };

  // Check if attack is ready
  if (isNpcAttackReady({ attackDelay, lastAttack: state.lastAttack, now })) {
    npcAttackReady = true;
    isAttacking = false;
  }

  if (state.isAggro) handleAggroState();

  // Get target player based on locked player ID
  const targetPlayer = resolvePlayer(lockedPlayerId);

  // If we killed the player already, do not target them anymore
  if (targetPlayer?.isDead) setLockedPlayerId(null);

  if (input.isStunned) return result({ type: "standStill" });

  const attackRange = getShouldAttackRange(npc.weapons);
  const movement = decideMovement();

  // intendAttack
  let action: NpcAction = idle;
  if (
    targetPlayer &&
    !isAttacking &&
    !state.isAiming &&
    checkInRange(npc, targetPlayer, attackRange) &&
    npcAttackReady
  ) {
    action = {
      type: "attack",
      direction: getCharacterDirection(npc, targetPlayer),
      castAngle: Math.atan2(targetPlayer.y - npc.y, targetPlayer.x - npc.x),
      windupMs: NPC_WARNING_DELAY + attackDelay,
    };
  } else if (
    // intendCastSpell (an attack in progress means the NPC is now aiming)
    !state.isAiming &&
    !state.isDead &&
    checkCastReady({
      lastCast: state.lastCast,
      castDelay: npc.stats?.castDelay,
      now,
    })
  ) {
    const { ability, abilitySlot } = findSuitableAbility(
      {
        self: npc,
        target: targetPlayer,
        abilities: npc.abilities,
        buffs: npc.buffs,
        lastCast: state.lastCast,
        castDelay: npc.stats?.castDelay,
        now,
      },
      rng,
    );
    if (ability) {
      action = {
        type: "cast",
        abilitySlot: abilitySlot as string,
        ability,
        windupMs: NPC_WARNING_DELAY + (npc.stats?.castDelay as number),
      };
    }
  }

  return result(movement, action);

  function decideMovement(): NpcMovement {
    // Check if player is in range for aggro
    const canChase = !!targetPlayer && handleAggroState() && !targetPlayer.isDead;
    const ctx: BehaviorContext = {
      input,
      target: targetPlayer,
      canChase,
      attackRange,
      isAttacking,
    };
    const chosen = chooseBehavior(ctx, npc.behaviors ?? DEFAULT_NPC_BEHAVIORS) ?? "wander";
    const behavior: NpcBehavior = NPC_BEHAVIORS[chosen];

    if (behavior.engaged && targetPlayer) {
      expireStealthOfPlayerId = targetPlayer.socketId;
      bubbleMessage = state.isAiming ? "0xFFAAAA!" : "?";
    } else {
      // Not fighting: let go of the target
      setLockedPlayerId(null);
      bubbleMessage = null;
    }
    return behavior.move(ctx, rng);
  }
}
