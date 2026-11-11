import { findSpell } from "@/content";
import { hasBuff, type ActiveBuff } from "@/rules/buffs";
import { checkCastReady, type LastCast } from "@/rules/spells";
import { NPC_BUFF_CAST_PROBABILITY } from "./constants";
import type { Body } from "./range";
import { getSpellBand, isInBand, type ShotBand } from "./reach";

export interface NpcAbility {
  base?: string;
  stats?: { castTime?: number } | null;
}

export interface AbilityChoiceInput {
  self: Body;
  /** The player being fought, if any (a dead one still counts). */
  target?: Body | null;
  abilities: Record<string, NpcAbility | null | undefined>;
  buffs: ActiveBuff[];
  lastCast: LastCast;
  castDelay?: number;
  now: number;
}

function isSpellCastable(input: AbilityChoiceInput, spell: NpcAbility | null | undefined) {
  const spellName = spell?.base;
  return (
    findSpell(spellName) &&
    checkCastReady({
      spellName,
      lastCast: input.lastCast,
      castDelay: input.castDelay,
      now: input.now,
    })
  );
}

/** Attack spells need the target within their range band, auras need no target (and a lucky roll). */
function isTargetSuitableForSpell(
  input: AbilityChoiceInput,
  spell: NpcAbility | null | undefined,
  rng: () => number,
) {
  const spellName = spell?.base;
  const band = getSpellBand(spellName);
  if (input.target && band) return isInBand(input.self, input.target, band);
  // Auras on itself, now and then, when out of a fight and not already under them
  const aura = findSpell(spellName);
  if (!input.target && aura?.delivery.type === "aura" && aura.targets.includes("self")) {
    const isLucky = rng() < NPC_BUFF_CAST_PROBABILITY;
    return isLucky && !hasBuff(input.buffs, spellName as string);
  }
  return false;
}

/** The first ability that is ready and fits the situation. */
export function findSuitableAbility(
  input: AbilityChoiceInput,
  rng: () => number,
): { ability?: NpcAbility; abilitySlot?: string } {
  for (const [slot, spell] of Object.entries(input.abilities)) {
    if (isSpellCastable(input, spell) && isTargetSuitableForSpell(input, spell, rng)) {
      return { ability: spell as NpcAbility, abilitySlot: slot };
    }
  }
  return {};
}

/**
 * Where it can land the attack spell it will cast next: the first one off cooldown, in the same
 * order `findSuitableAbility` checks them. Undefined when none is ready.
 */
export function getNextSpellBand(input: AbilityChoiceInput): ShotBand | undefined {
  for (const spell of Object.values(input.abilities)) {
    const band = getSpellBand(spell?.base);
    if (band && isSpellCastable(input, spell)) return band;
  }
  return undefined;
}

/** Where its longest-reaching attack spell can land from, ready or not. */
export function getLongestSpellBand(
  abilities: Record<string, NpcAbility | null | undefined>,
): ShotBand | undefined {
  let longest: ShotBand | undefined;
  for (const spell of Object.values(abilities)) {
    const band = getSpellBand(spell?.base);
    if (band && (!longest || band.max > longest.max)) longest = band;
  }
  return longest;
}
