import { findSpell, type SpellDefinition } from "@/content";
import type { StatBag } from "@/rules/stats";
import { getSpell } from "./shape";

/** When each spell was last cast, plus `global` for the shared cast delay. */
export type LastCast = Record<string, number>;

export interface CastReadyInput {
  spellName?: string;
  lastCast: LastCast;
  castDelay?: number;
  now: number;
}

/** A spell's own cooldown in ms, on top of the shared cast delay. */
export function getSpellCooldown(spellName: string | undefined) {
  return findSpell(spellName)?.cooldown ?? 0;
}

/** True if the global cast delay, and the spell's own cooldown, have passed. */
export function checkCastReady({ spellName, lastCast, castDelay, now }: CastReadyInput): boolean {
  let isThisSpellReady = true;
  if (spellName) {
    const last = lastCast?.[spellName] ?? 0;
    isThisSpellReady = now - last > (castDelay as number) + getSpellCooldown(spellName);
  }
  const isGlobalReady = now - lastCast.global > (castDelay as number);
  return isThisSpellReady && isGlobalReady;
}

/** How far through its cooldown (global cast delay and its own) a spell is, 0 to 1. */
export function getCastReadiness({ spellName, lastCast, castDelay, now }: CastReadyInput): number {
  const delay = castDelay ?? 0;
  const progress = (elapsed: number, total: number) =>
    total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 1;
  const global = progress(now - (lastCast?.global ?? 0), delay);
  if (!spellName) return global;
  const total = delay + getSpellCooldown(spellName);
  return Math.min(global, progress(now - (lastCast?.[spellName] ?? 0), total));
}

/**
 * A key of a character's abilities record. Numbers and numeric strings name the same slot
 * (`abilities[1]` is `abilities["1"]`); clients send either.
 */
export type AbilitySlot = number | string;

/** The part of an ability item the cast rules read. */
interface CastAbility {
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

  const allowed = stats?.mp >= mpCost && stats?.hp > hpCost && stats?.sp >= spCost;

  /* Only a cast that goes ahead starts the cooldowns; one refused for its cost must not */
  let castTimes: LastCast | undefined;
  if (input.shouldUpdateState && allowed) {
    castTimes = { global: input.now };
    if (spellName) castTimes[spellName] = input.now;
  }

  return { allowed, castTimes };
}

export interface AbilityDetailsInput {
  abilities?: Record<string, Record<string, any> | null | undefined>;
  /** Without an ability slot the attack is a ranged one if a ranged weapon is held. */
  hasRangedWeapon: boolean;
}

/** An ability's item data, with the spell it casts. */
export type AbilityDetails = Record<string, any> & { spellName: string; spell: SpellDefinition };

/** The item in an ability slot and the spell it casts; no slot is the plain attack. */
export function getAbilityDetails(
  { abilities, hasRangedWeapon }: AbilityDetailsInput,
  abilitySlot: AbilitySlot | undefined,
): AbilityDetails {
  const ability = abilitySlot ? abilities?.[abilitySlot] : undefined;
  const spellName: string = abilitySlot
    ? ability?.base
    : hasRangedWeapon
      ? "attack-ranged"
      : "attack-melee";
  return { ...ability, spellName, spell: getSpell(spellName) };
}
