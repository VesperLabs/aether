import type { ActiveBuff } from "@/rules/buffs";
import { isRespawnDue } from "@/rules/combat";
import { checkCastReady, type LastCast } from "@/rules/spells";
import type { CardinalDirection, Point } from "@/rules/world";
import {
  findSuitableAbility,
  getLongestSpellBand,
  getNextSpellBand,
  type NpcAbility,
} from "./abilities";
import { decideAggro, isNpcAttackReady, type NpcPlayerView, type NpcSelfView } from "./aggro";
import { isNpcAggressive, isNpcPassive, keepsAway } from "./behavior-options";
import {
  NPC_EXTRA_CAST_TIME,
  NPC_HOME_RANGE,
  NPC_LEASH_RANGE,
  NPC_LUNGE_EXTRA_WINDUP,
  NPC_WARNING_DELAY,
} from "./constants";
import { checkInRange, distanceBetween, getShouldAttackRange } from "./range";
import { getSwingFacing, isInMeleeReach } from "./hand-reach";
import { getWeaponBand, isInBand } from "./reach";
import type { Body, NpcWeaponRanges } from "./range";
import type { Rng } from "@/rules/world";
import { NPC_BEHAVIOR_IDS, NPC_BEHAVIORS, type NpcBehaviorId } from "./behaviors/behavior-list";
import type { BehaviorContext, NpcBehavior } from "./behaviors/types";
import { chooseBehavior } from "./brain";
import type { ActorBehaviors, BodyHabitat } from "@/content";
import { isKnockedBack, type KnockbackState, type LungeState } from "@/rules/movement";
import { decideLungeMovement, isLungeSpell, isRecoveringFromLunge } from "./lunge";
import type { NpcMovement } from "./movement";
import { decideSwing, type NpcSwing } from "./swings";
import { landingDrift } from "./landing";

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
    /** How it is moving now, px/s: a bird touching down carries on a little that way. */
    vx?: number;
    vy?: number;
    startingCoords: Body;
    /** Where it leashes to and walks back to: its leader's spawn for followers, else its own. */
    home?: Body;
    /** Where the player who last started talking to it is, while anyone is. */
    talker?: Body | null;
    abilities: Record<string, NpcAbility | null | undefined>;
    buffs: ActiveBuff[];
    weapons: NpcWeaponRanges;
    /** What it does, from content and its map spawn; unset parts come from the defaults. */
    behaviors?: ActorBehaviors;
    /** Warning before an attack or spell lands, from content; unset means `NPC_WARNING_DELAY`. */
    windupMs?: number;
  };
  state: LungeState &
    KnockbackState & {
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
      /** When it began its one retreat this fight, if it has. */
      retreatAt?: number;
      /** An owned NPC's owner: it never walks home to reset. */
      ownerId?: string | null;
      /** Leashed and walking home; players are ignored until it gets there. */
      isResetting?: boolean;
      /** What it did last tick, which it slightly prefers to keep doing. */
      behavior?: NpcBehaviorId;
      /** When a player last came too near a `skittish` NPC, and where it is getting away to. */
      scaredAt?: number;
      escapeTo?: { x: number; y: number };
      /** The habitat it is in, of its body's several; unset or null is the first. */
      habitat?: string | null;
    };
  isStunned: boolean;
  /** Its windup (while `isAiming`) is aimed at someone, not a self buff cast out of a fight. */
  isWindupTargeted?: boolean;
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
  /** Can it go straight to `to`, inside the map and its habitat? Assumed so when not given. */
  canTravel?: (to: Point) => boolean;
  /** Is the NPC next to a collision tile (so it should path)? */
  isNearCollideTile: boolean;
  /** Is the NPC outside the map or inside a collision tile? */
  isOutOfBounds: boolean;
}

export type { NpcMovement } from "./movement";

export type NpcAction =
  | { type: "idle" }
  /** Wind up for `windupMs`, then swing. */
  | {
      type: "attack";
      direction: CardinalDirection;
      castAngle: number;
      windupMs: number;
      swing?: NpcSwing;
    }
  | { type: "cast"; abilitySlot: string; ability: NpcAbility; windupMs: number };

export interface NpcDecision {
  /** What the NPC is locked on to after this tick. */
  lockedPlayerId: string | null | undefined;
  /** It switched to a new target: restart the attack timer. */
  resetAttackTimer: boolean;
  npcAttackReady: boolean | undefined;
  isAttacking: boolean | undefined;
  /** Chasing a player breaks their stealth. */
  expireStealthOfPlayerId?: string;
  /** The player the NPC acted against this tick, as resolved before it moved. */
  targetPlayerId?: string;
  movement: NpcMovement;
  action: NpcAction;
  /** The behavior that chose the movement. */
  behavior: NpcBehaviorId;
  /** The habitat that behavior takes it to; unset is its body's first. */
  habitat?: BodyHabitat;
  /** Pulled past its leash: forget every player and walk home. */
  startReset?: boolean;
  /** Home after a reset: heal up and go back to normal. */
  finishReset?: boolean;
  /** It gave up the fight mid-windup: the swing or spell never lands. */
  cancelWindup?: boolean;
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
  let expireStealthOfPlayerId: string | undefined;
  let behaviorId: NpcBehaviorId = state.behavior ?? "wander";
  let startReset = false;
  let finishReset = false;
  let cancelWindup = false;
  let habitat: BodyHabitat | undefined;
  const isResetting = () => (!!state.isResetting || startReset) && !finishReset;

  const idle: NpcAction = { type: "idle" };
  const result = (movement: NpcMovement, action: NpcAction = idle): NpcDecision => ({
    lockedPlayerId,
    resetAttackTimer,
    npcAttackReady,
    isAttacking,
    expireStealthOfPlayerId,
    targetPlayerId: targetPlayer?.socketId,
    movement,
    action,
    behavior: behaviorId,
    habitat,
    ...(startReset && { startReset }),
    ...(finishReset && { finishReset }),
    ...(cancelWindup && { cancelWindup }),
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

  if (isResetting() || isNpcPassive(npc)) {
    // Walking home, or never fights: nobody gets noticed
    setLockedPlayerId(null);
    if (isResetting() && checkInRange(npc, npc.home ?? npc.startingCoords, NPC_HOME_RANGE)) {
      finishReset = true;
    }
  } else {
    if (isNpcAggressive(npc)) handleAggroState();
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

  // A shove overrides everything: it can't walk, turn or strike until it's over
  if (isKnockedBack(state, now)) {
    const elapsed = now - (state.knockbackAt ?? now);
    return result({ type: "knockback", angle: state.knockbackAngle ?? 0, elapsed });
  }
  if (input.isStunned) return result({ type: "standStill" });

  const attackRange = getShouldAttackRange(npc.weapons, npc.bodySize);
  // Ranged weapons fire from inside the arrow's flight; melee closes to its swing's reach
  const isRanged = !!(npc.weapons?.handLeft || npc.weapons?.handRight);
  const weaponBand = isRanged ? getWeaponBand(attackRange) : undefined;
  const hasClearShot = !!targetPlayer && (input.hasClearShot?.(targetPlayer) ?? true);
  // Close enough to swing: the weapon beats its spells
  const inMeleeReach = !weaponBand && isInMeleeReach(npc, targetPlayer, attackRange);
  // Still decided while lunging, so aggro keeps up; the lunge just overrides the move
  const planned = decideMovement();
  // Lost its foe mid-fight (outran, hid, killed): walk home and heal, as after a leash. Not a
  // pet or follower, nor one that already retreated: it stays hurt rather than heal off a getaway.
  const lostFoe = !!state.lockedPlayerId && !lockedPlayerId && !isResetting();
  // One that never fights never had a foe to lose: a hit only marks who struck it, so it stays hurt
  const fights = !isNpcPassive(npc);
  if (lostFoe && fights && !state.ownerId && state.retreatAt === undefined) startReset = true;
  // Winding up plants its feet; giving up the fight calls it off (an untargeted buff has no fight)
  const chosen = NPC_BEHAVIORS[behaviorId];
  const leftFight = !chosen.engaged && input.isWindupTargeted !== false;
  cancelWindup = !!state.isAiming && (leftFight || !!chosen.holdsFire);
  // ...and through the swing that follows, even once the target is dead
  const holdsWindup = (!!state.isAiming && !cancelWindup) || !!isAttacking;
  const movement =
    decideLungeMovement(state, now) ?? (holdsWindup ? { type: "standStill" } : planned);
  const isRecovering = isRecoveringFromLunge(state, now);
  if (chosen.holdsFire) return result(movement);

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
      : isInMeleeReach(npc, targetPlayer, attackRange)) &&
    npcAttackReady
  ) {
    action = {
      type: "attack",
      direction: getSwingFacing(npc, targetPlayer),
      castAngle: Math.atan2(targetPlayer.y - npc.y, targetPlayer.x - npc.x),
      ...decideSwing(!!weaponBand, warningMs, attackDelay, rng),
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
        // No clear shot, or close enough to swing: only spells that need no target, like self buffs
        target: hasClearShot && !inMeleeReach ? targetPlayer : null,
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
        /* A spell's cast time plus a beat to dodge; spells without one wind up on the NPC's stats */
        windupMs:
          (ability.stats?.castTime && ability.stats.castTime + NPC_EXTRA_CAST_TIME) ||
          warningMs +
            (isLungeSpell(ability.base)
              ? attackDelay + NPC_LUNGE_EXTRA_WINDUP
              : (npc.stats?.castDelay as number)),
      };
    }
  }

  return result(movement, action);

  function decideMovement(): NpcMovement {
    // Check if player is in range for aggro
    const canChase = !isResetting() && !!targetPlayer && handleAggroState() && !targetPlayer.isDead;
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
      (keepsAway(npc) ? getLongestSpellBand(npc.abilities) : undefined);
    const ctx: BehaviorContext = {
      input,
      target: targetPlayer,
      canChase,
      attackRange,
      standBand,
      hasClearShot,
      inMeleeReach,
      isAttacking,
      isResetting: isResetting(),
    };
    behaviorId = chooseBehavior(ctx, NPC_BEHAVIOR_IDS, state.behavior) ?? "idle";
    const behavior: NpcBehavior = NPC_BEHAVIORS[behaviorId];
    habitat = behavior.habitat?.(ctx);
    // Touching down (a bird landing): hop on a little the way it flew, slowing, then carry on
    if (state.habitat && !habitat) return landingDrift(npc, input.time);

    if (behavior.engaged && targetPlayer) {
      expireStealthOfPlayerId = targetPlayer.socketId;
    } else {
      // Not fighting: let go of the target
      setLockedPlayerId(null);
    }
    return behavior.move(ctx, rng);
  }
}
