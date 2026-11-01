import type { ActiveBuff } from "@/rules/buffs";
import { isRespawnDue } from "@/rules/combat";
import { checkCastReady, type LastCast } from "@/rules/spells";
import { getCharacterDirection, type CardinalDirection } from "@/rules/world";
import {
  findSuitableAbility,
  getLongestSpellBand,
  getNextSpellBand,
  type NpcAbility,
} from "./abilities";
import { decideAggro, isNpcAttackReady, type NpcPlayerView, type NpcSelfView } from "./aggro";
import {
  NPC_HOME_RANGE,
  NPC_LEASH_RANGE,
  NPC_SHOULD_ATTACK_RANGE,
  NPC_WARNING_DELAY,
} from "./constants";
import { checkInRange, distanceBetween, getShouldAttackRange } from "./range";
import { getWeaponBand, isInBand } from "./reach";
import type { Body, NpcWeaponRanges } from "./range";
import type { Rng } from "@/rules/world";
import {
  DEFAULT_NPC_BEHAVIORS,
  NPC_BEHAVIORS,
  type BehaviorContext,
  type NpcBehavior,
  type NpcBehaviorId,
  isMovementBehavior,
} from "./behaviors";
import { chooseBehavior } from "./brain";
import type { MobBehavior } from "@/content";
import type { LungeState } from "@/rules/movement";
import { decideLungeMovement, isLungeSpell, isRecoveringFromLunge } from "./lunge";
import type { WanderStep } from "./wander";

export interface NpcBehaviorInput {
  /** Wall clock (ms). */
  now: number;
  /** Scene time, which paces wandering. */
  time: number;
  /** Milliseconds since the last tick. */
  delta: number;
  npc: NpcSelfView & {
    stats?: {
      level?: number;
      walkSpeed?: number;
      attackDelay?: number;
      castDelay?: number;
      hp?: number;
      maxHp?: number;
    } | null;
    startingCoords: Body;
    /** Where it leashes to and walks back to: its leader's spawn for followers, else its own. */
    home?: Body;
    hasTalkers: boolean;
    abilities: Record<string, NpcAbility | null | undefined>;
    buffs: ActiveBuff[];
    weapons: NpcWeaponRanges;
    /** Opt-in behaviors from content, on top of `DEFAULT_NPC_BEHAVIORS`. */
    behaviors?: readonly MobBehavior[];
    /** Warning before an attack or spell lands, from content; unset means `NPC_WARNING_DELAY`. */
    windupMs?: number;
  };
  state: LungeState & {
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
    /** Which way it sidesteps around its target between shots. */
    strafeClockwise?: boolean;
    /** Loop time at which it next picks a side to sidestep. */
    nextStrafeAt?: number;
    /** Leashed and walking home; players are ignored until it gets there. */
    isResetting?: boolean;
    /** What it did last tick, which it slightly prefers to keep doing. */
    behavior?: NpcBehaviorId;
  };
  isStunned: boolean;
  /** The player `lockedPlayerId` points at, if they are still around. */
  lockedPlayer?: NpcPlayerView | null;
  /** The player in the NPC's room nearest to it. Needed when aggro or locked on. */
  nearestPlayer?: NpcPlayerView | null;
  /** Whoever tops the NPC's threat table, if they are still around. Overrides the locked target. */
  threatTarget?: NpcPlayerView | null;
  /** The NPC this one follows, if it has a leader nearby. */
  leader?: Body | null;
  /** Is there no wall between the NPC and `target`? Assumed clear when not given. */
  hasClearShot?: (target: Body) => boolean;
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
  /** Run away from the target, around walls, at `speedRatio` of walk speed (default full). */
  | { type: "flee"; speedRatio?: number }
  /** Sidestep around the target, drifting back to `distance` from it. Sets the side and when to next pick one. */
  | { type: "strafe"; clockwise: boolean; distance: number; nextStrafeAt?: number }
  /** Walk to the leader. */
  | { type: "follow"; pathed: boolean }
  | ({ type: "wander" } & WanderStep)
  /** Dash along `angle` (radians): a lunge spell carries it. */
  | { type: "lunge"; angle: number };

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
  /** The behavior that chose the movement. */
  behavior: NpcBehaviorId;
  /** Pulled past its leash: forget every player and walk home. */
  startReset?: boolean;
  /** Home after a reset: heal up and go back to normal. */
  finishReset?: boolean;
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
  const warningMs = npc.windupMs ?? NPC_WARNING_DELAY;

  let npcAttackReady = state.npcAttackReady;
  let isAttacking = state.isAttacking;
  let lockedPlayerId = state.lockedPlayerId;
  let resetAttackTimer = false;
  let bubbleMessage: string | null | undefined;
  let expireStealthOfPlayerId: string | undefined;
  let behaviorId: NpcBehaviorId = state.behavior ?? "wander";
  let startReset = false;
  let finishReset = false;
  const isResetting = () => (!!state.isResetting || startReset) && !finishReset;

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
    behavior: behaviorId,
    ...(startReset && { startReset }),
    ...(finishReset && { finishReset }),
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
    if (id && id === input.threatTarget?.socketId) return input.threatTarget;
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

  if (isResetting()) {
    // Walking home: nobody gets noticed until it arrives
    setLockedPlayerId(null);
    if (checkInRange(npc, npc.home ?? npc.startingCoords, NPC_HOME_RANGE)) finishReset = true;
  } else {
    if (isNpcAggressive(npc.behaviors)) handleAggroState();
    // Threat outranks proximity: fight whoever angered it most
    if (input.threatTarget && !input.threatTarget.isDead) {
      setLockedPlayerId(input.threatTarget.socketId);
    }
    // Pulled too far from home: give up the fight
    const home = npc.home ?? npc.startingCoords;
    if (lockedPlayerId && distanceBetween(npc, home) > NPC_LEASH_RANGE) {
      startReset = true;
      setLockedPlayerId(null);
    }
  }

  // Get target player based on locked player ID
  const targetPlayer = resolvePlayer(lockedPlayerId);

  // If we killed the player already, do not target them anymore
  if (targetPlayer?.isDead) setLockedPlayerId(null);

  if (input.isStunned) return result({ type: "standStill" });

  const attackRange = getShouldAttackRange(npc.weapons);
  // Ranged weapons fire from inside the arrow's flight; melee closes to touching
  const weaponBand =
    attackRange !== NPC_SHOULD_ATTACK_RANGE ? getWeaponBand(attackRange) : undefined;
  const hasClearShot = !!targetPlayer && (input.hasClearShot?.(targetPlayer) ?? true);
  // Still decided while lunging, so aggro and bubbles keep up; the lunge just overrides the move
  const planned = decideMovement();
  const movement = decideLungeMovement(state, now) ?? planned;
  const isRecovering = isRecoveringFromLunge(state, now);
  if (NPC_BEHAVIORS[behaviorId].holdsFire) return result(movement);

  // intendAttack
  let action: NpcAction = idle;
  if (
    targetPlayer &&
    hasClearShot &&
    !isAttacking &&
    !state.isAiming &&
    !isRecovering &&
    (weaponBand
      ? isInBand(npc, targetPlayer, weaponBand)
      : checkInRange(npc, targetPlayer, attackRange)) &&
    npcAttackReady
  ) {
    action = {
      type: "attack",
      direction: getCharacterDirection(npc, targetPlayer),
      castAngle: Math.atan2(targetPlayer.y - npc.y, targetPlayer.x - npc.x),
      windupMs: warningMs + attackDelay,
    };
  } else if (
    // intendCastSpell (an attack in progress means the NPC is now aiming)
    !state.isAiming &&
    !state.isDead &&
    !isRecovering &&
    checkCastReady({
      lastCast: state.lastCast,
      castDelay: npc.stats?.castDelay,
      now,
    })
  ) {
    const { ability, abilitySlot } = findSuitableAbility(
      {
        self: npc,
        // No clear shot: only spells that need no target, like self buffs
        target: hasClearShot ? targetPlayer : null,
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
        windupMs:
          warningMs + (isLungeSpell(ability.base) ? attackDelay : (npc.stats?.castDelay as number)),
      };
    }
  }

  return result(movement, action);

  function decideMovement(): NpcMovement {
    // Check if player is in range for aggro
    const canChase = !isResetting() && !!targetPlayer && handleAggroState() && !targetPlayer.isDead;
    const ids = [...DEFAULT_NPC_BEHAVIORS, ...(npc.behaviors ?? []).filter(isMovementBehavior)];
    // Stand where the next shot lands: the spell it is about to cast, else its ranged weapon,
    // else (kiters) its longest spell
    const nextSpellBand = getNextSpellBand({
      self: npc,
      target: targetPlayer,
      abilities: npc.abilities,
      buffs: npc.buffs,
      lastCast: state.lastCast,
      castDelay: npc.stats?.castDelay,
      now,
    });
    const standBand =
      nextSpellBand ??
      weaponBand ??
      (ids.includes("kite") ? getLongestSpellBand(npc.abilities) : undefined);
    const ctx: BehaviorContext = {
      input,
      target: targetPlayer,
      canChase,
      attackRange,
      standBand,
      hasClearShot,
      isAttacking,
      isResetting: isResetting(),
    };
    behaviorId = chooseBehavior(ctx, ids, state.behavior) ?? "wander";
    const behavior: NpcBehavior = NPC_BEHAVIORS[behaviorId];

    if (behavior.engaged && targetPlayer) {
      expireStealthOfPlayerId = targetPlayer.socketId;
      // Winding up shows a countdown ring over the head instead (client/views/windup-ring.ts)
      bubbleMessage = state.isAiming ? null : "?";
    } else {
      // Not fighting: let go of the target
      setLockedPlayerId(null);
      bubbleMessage = null;
    }
    return behavior.move(ctx, rng);
  }
}

/** Does it go after players on sight, rather than only fighting back? */
export function isNpcAggressive(behaviors: readonly MobBehavior[] | undefined) {
  return !!behaviors?.includes("aggressive");
}
