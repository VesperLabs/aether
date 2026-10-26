import { spellDetails } from "@/shared/content";
import { hasBuff, type ActiveBuff } from "@/shared/rules/buffs";
import { BUFF_SPELLS, checkCastReady, type LastCast } from "@/shared/rules/spells";
import { NPC_BUFF_CAST_PROBABILITY } from "./constants";
import { checkInRange, type Body } from "./range";

export interface NpcAbility {
  base?: string;
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

type Details = {
  allowedTargets?: readonly string[];
  npcCastRange?: readonly [number, number];
};

const detailsOf = (spellName?: string) =>
  (spellDetails as unknown as Record<string, Details>)?.[spellName as string];

export function isSpellCastable(input: AbilityChoiceInput, spell: NpcAbility | null | undefined) {
  const spellName = spell?.base;
  return (
    detailsOf(spellName) &&
    checkCastReady({
      spellName,
      lastCast: input.lastCast,
      castDelay: input.castDelay,
      now: input.now,
    })
  );
}

/** Attack spells need the target within their range band, auras need no target (and a lucky roll). */
export function isTargetSuitableForSpell(
  input: AbilityChoiceInput,
  spell: NpcAbility | null | undefined,
  rng: () => number,
) {
  const spellName = spell?.base;
  const details = detailsOf(spellName);

  // attack spells
  if (input.target && details?.allowedTargets?.includes("enemy") && details?.npcCastRange) {
    const [min, max] = details.npcCastRange;
    return (
      checkInRange(input.self, input.target, max) && !checkInRange(input.self, input.target, min)
    );
  }
  // auras
  if (!input.target && details?.allowedTargets?.includes("self")) {
    if (BUFF_SPELLS.includes(spellName as string)) {
      const randomCheck = rng() < NPC_BUFF_CAST_PROBABILITY;
      // if we already have the buff, don't recast
      return !hasBuff(input.buffs, spellName as string) && randomCheck;
    }
  }
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
