import { spellDetails } from "@/content";
import type { StatBag } from "@/rules/stats";

/** Spells that put a buff on the caster or target and show as an aura. */
export const BUFF_SPELLS = [
  "evasion",
  "brute",
  "endurance",
  "genius",
  "haste",
  "stun",
  "slow",
  "regeneration",
  "stealth",
  "guard",
];

/** When each spell was last cast, plus `global` for the shared cast delay. */
export type LastCast = Record<string, number>;

export interface CastReadyInput {
  spellName?: string;
  lastCast: LastCast;
  castDelay?: number;
  now: number;
}

/** True if the global cast delay, and the spell's own cooldown, have passed. */
export function checkCastReady({ spellName, lastCast, castDelay, now }: CastReadyInput): boolean {
  let isThisSpellReady = true;
  if (spellName) {
    const baseCooldown =
      (spellDetails as Record<string, { baseCooldown?: number }>)?.[spellName]?.baseCooldown ?? 0;
    const last = lastCast?.[spellName] ?? 0;
    isThisSpellReady = now - last > (castDelay as number) + baseCooldown;
  }
  const isGlobalReady = now - lastCast.global > (castDelay as number);
  return isThisSpellReady && isGlobalReady;
}

/**
 * A key of a character's abilities record. Numbers and numeric strings name the same slot
 * (`abilities[1]` is `abilities["1"]`); clients send either.
 */
export type AbilitySlot = number | string;

/** The part of an ability item the cast rules read. */
export interface CastAbility {
  base?: string;
  stats?: { mpCost?: number; hpCost?: number; spCost?: number } | null;
}

export interface CanCastInput {
  abilitySlot: AbilitySlot | undefined;
  isStunned: boolean;
  isDead: boolean;
  /** "player" characters must have the slot unlocked. */
  kind?: string;
  activeItemSlots?: string[];
  abilities?: Record<string, CastAbility | null | undefined>;
  stats?: StatBag;
  lastCast: LastCast;
  now: number;
  /** Record the cast time (the normal case) or just ask. */
  shouldUpdateState: boolean;
}

export interface CanCastResult {
  /** `undefined` for the quiet refusals (stunned, slot not active), which callers treat as no. */
  allowed: boolean | undefined;
  /** Cast times to store in `lastCast`. Set whenever the spell was ready, even if it ends up unaffordable. */
  castTimes?: LastCast;
}

/**
 * Can this ability be used now? Attacks (no slot) always can unless stunned or dead.
 * Spells need an unlocked slot, a ready cooldown and enough mp, sp and hp (hp must stay above 0).
 */
export function canCastSpell(input: CanCastInput): CanCastResult {
  const { abilitySlot, isStunned, isDead, kind, activeItemSlots, abilities, stats, lastCast } =
    input;
  if (isStunned) return { allowed: undefined };
  if (isDead) return { allowed: false };
  if (!abilitySlot) return { allowed: true };
  if (kind === "player") {
    if (!activeItemSlots?.includes?.(`${abilitySlot}`)) return { allowed: undefined };
  }

  const ability = abilities?.[abilitySlot];
  const spellName = ability?.base;
  if (!checkCastReady({ spellName, lastCast, castDelay: stats?.castDelay, now: input.now })) {
    return { allowed: false };
  }
  const mpCost = ability?.stats?.mpCost || 0;
  const hpCost = ability?.stats?.hpCost || 0;
  const spCost = ability?.stats?.spCost || 0;

  let castTimes: LastCast | undefined;
  if (input.shouldUpdateState) {
    castTimes = { global: input.now };
    if (spellName) castTimes[spellName] = input.now;
  }

  return {
    allowed: stats?.mp >= mpCost && stats?.hp > hpCost && stats?.sp >= spCost,
    castTimes,
  };
}

export interface AbilityDetailsInput {
  abilities?: Record<string, Record<string, any> | null | undefined>;
  /** Without an ability slot the attack is a ranged one if a ranged weapon is held. */
  hasRangedWeapon: boolean;
}

/** An ability's item data merged with its spell definition, plus `spellName`. */
export function getAbilityDetails(
  { abilities, hasRangedWeapon }: AbilityDetailsInput,
  abilitySlot: AbilitySlot | undefined,
): Record<string, any> & { spellName: string } {
  let ability: Record<string, any> | null | undefined;
  let spellName: string;

  if (!abilitySlot) {
    spellName = hasRangedWeapon ? "attack-ranged" : "attack-melee";
  } else {
    ability = abilities?.[abilitySlot];
    spellName = ability?.base;
  }

  return {
    ...ability,
    ...(spellDetails as Record<string, object>)?.[spellName],
    spellName,
  };
}
