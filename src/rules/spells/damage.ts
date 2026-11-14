import { calculateElementalDamage, type ElementalResult } from "@/rules/combat";
import { randomInt, type Rng } from "@/rules/loot";
import { addValuesToExistingKeys, type StatBag } from "@/rules/stats";

/** Part of spell power applied to elemental spell min/max (full power was melting warriors in PvP). */
const SPELL_POWER_ELEMENTAL_FACTOR = 0.5;

/**
 * Rolls a spell's elemental damage: its `effects` plus the caster's matching stats, with part of
 * the caster's spell power added to each range, less the victim's resistances.
 */
export function rollSpellDamage(
  effects: Record<string, number>,
  casterStats: StatBag,
  victimStats: StatBag,
  rng: Rng,
): ElementalResult {
  const baseElementalDamages = addValuesToExistingKeys(effects, casterStats);

  /* Spell power was added at full value to min/max — mages could 2-shot warriors in PvP.
   * Only part of spell power should scale elemental rolls (rest still helps heals / other uses). */
  const spellPowerBonus = Math.floor(
    Number(casterStats?.spellPower || 0) * SPELL_POWER_ELEMENTAL_FACTOR,
  );
  const dmgWithSpellPower = Object.entries(baseElementalDamages).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      acc[key] = Number(value) + spellPowerBonus;
      return acc;
    },
    {},
  );

  return calculateElementalDamage(dmgWithSpellPower, victimStats, rng);
}

export interface SpellCrit {
  isCritical: boolean;
  eleDamage: number;
  holyDamage: number;
}

/** Rolls the caster's crit chance for a spell that does damage, scaling both damages if it crits. */
export function rollSpellCrit(
  { eleDamage, holyDamage }: Pick<ElementalResult, "eleDamage" | "holyDamage">,
  casterStats: StatBag,
  rng: Rng,
): SpellCrit {
  const critRoll = randomInt(rng, 1, 100);
  if (casterStats.critChance && critRoll <= casterStats.critChance) {
    const multiplier = casterStats?.critMultiplier || 1;
    return {
      isCritical: true,
      /* Only a damage the spell has gets scaled: a crit must not add holy to a waterball */
      eleDamage: eleDamage > 0 ? Math.floor(Math.max(1, eleDamage * multiplier)) : 0,
      holyDamage: holyDamage > 0 ? Math.floor(Math.max(1, holyDamage * multiplier)) : 0,
    };
  }
  return { isCritical: false, eleDamage, holyDamage };
}
