import { hasBuff } from "@/rules/buffs/rules";
import { filterVisibleEquipment } from "@/rules/character/character";
import {
  getAbilityCosts,
  getAttackActionName,
  getAttackSpCost,
  getNextAttackCount,
  getSwingDelay,
  hasStaminaFor,
} from "@/rules/combat/attack";
import { hasRangedWeapon, hasWeapon, type WeaponHolder } from "@/rules/combat/weapons";
import {
  canCastSpell,
  getAbilityDetails,
  type AbilitySlot,
  type LastCast,
} from "@/rules/spells/cast";
import { statsOf } from "@/network/session/character-stats";
import type { ClientCharacter } from "@/network/session/client-state";

/*
 * What the hero's own client decides about fighting, from the hero's record in the client state
 * plus the timings only this client knows. The server checks everything again.
 */

/** Holding attack with a melee weapon swings again this long after the last swing is ready. */
const HOLD_REPEAT_MARGIN_MS = 60;

/** Timings of the hero's own actions, kept by its session and reset on every `heroInit`. */
export interface HeroCombatState {
  lastAttack: number;
  lastAttackCount?: number;
  lastCast: LastCast;
  knockbackAt?: number;
  knockbackAngle?: number;
  lastDodge?: number;
  dodgeAngle?: number;
  dodgeFacing?: string;
  lungeAt?: number;
  lungeAngle?: number;
  /** Rolled last frame: the frame after a roll still sends its input unthrottled. */
  wasRolling: boolean;
}

export function createHeroCombat(): HeroCombatState {
  return { lastAttack: 0, lastCast: {}, wasRolling: false };
}

/** The hero as the weapon rules read it: only what is worn in an active slot counts. */
function armsOf(hero: ClientCharacter): WeaponHolder {
  return {
    profile: hero.profile,
    equipment: hero.equipment,
    visibleEquipment: filterVisibleEquipment(hero),
  };
}

export function isStunned(hero: ClientCharacter) {
  return hasBuff(hero.buffs, "stun");
}

export function isDead(hero: ClientCharacter) {
  return !!hero.state?.isDead;
}

export function hasRanged(hero: ClientCharacter) {
  return hasRangedWeapon(armsOf(hero));
}

/** The delay of the last swing: what the next one waits on. */
function getLastSwingDelay(hero: ClientCharacter, combat: HeroCombatState) {
  return getSwingDelay(statsOf(hero) as { attackDelay: number }, combat.lastAttackCount);
}

/** True while the last swing is still recovering. */
export function isSwinging(hero: ClientCharacter, combat: HeroCombatState, now: number) {
  return now - combat.lastAttack < getLastSwingDelay(hero, combat);
}

export interface RootFlags {
  isAiming?: boolean;
  isHoldingAttack?: boolean;
}

/** A melee swing, aiming or holding attack roots the hero; a bow keeps walking while it shoots. */
export function isRooted(
  hero: ClientCharacter,
  combat: HeroCombatState,
  flags: RootFlags,
  now: number,
) {
  return (
    (!hasRanged(hero) && isSwinging(hero, combat, now)) ||
    !!flags.isAiming ||
    !!flags.isHoldingAttack
  );
}

/** Holding attack with a melee weapon: true once the next swing is due. */
export function isHoldSwingDue(hero: ClientCharacter, combat: HeroCombatState, now: number) {
  const arms = armsOf(hero);
  if (!hasWeapon(arms) || hasRangedWeapon(arms)) return false;
  return combat.lastAttack < now - getLastSwingDelay(hero, combat) - HOLD_REPEAT_MARGIN_MS;
}

/** Can the hero use this ability slot now (cooldowns, unlocked slot, costs)? */
export function checkCast(
  hero: ClientCharacter,
  combat: HeroCombatState,
  abilitySlot: AbilitySlot | undefined,
  now: number,
) {
  return canCastSpell({
    abilitySlot,
    isStunned: isStunned(hero),
    isDead: isDead(hero),
    kind: hero.kind,
    activeItemSlots: hero.activeItemSlots,
    abilities: hero.abilities,
    stats: statsOf(hero),
    lastCast: combat.lastCast,
    now,
    shouldUpdateState: true,
  });
}

export function abilityOf(hero: ClientCharacter, abilitySlot: AbilitySlot | undefined) {
  return getAbilityDetails(
    { abilities: hero.abilities, hasRangedWeapon: hasRanged(hero) },
    abilitySlot,
  );
}

/** A swing that may go ahead: which hand, and the cast times it starts. */
export interface PlannedSwing {
  count: number;
  castTimes?: LastCast;
}

/**
 * Whether the hero may swing now, and which swing it is: not stunned or dead, armed, the last
 * swing recovered, the ability (if any) ready and affordable, and the SP for the weapon.
 */
export function planSwing(
  hero: ClientCharacter,
  combat: HeroCombatState,
  abilitySlot: AbilitySlot | undefined,
  now: number,
): PlannedSwing | undefined {
  const arms = armsOf(hero);
  if (isStunned(hero) || isDead(hero) || !hasWeapon(arms)) return undefined;
  if (isSwinging(hero, combat, now)) return undefined;
  const { allowed, castTimes } = checkCast(hero, combat, abilitySlot, now);
  if (!allowed) return undefined;
  const count = getNextAttackCount(combat.lastAttackCount, arms);
  const { stats } = getAttackActionName(arms, {
    action: "",
    ability: abilityOf(hero, abilitySlot),
    count,
  });
  const spCost = getAttackSpCost(arms.visibleEquipment, count) + getAbilityCosts(stats).sp;
  if (!hasStaminaFor(statsOf(hero).sp, spCost)) return undefined;
  return { count, castTimes };
}
