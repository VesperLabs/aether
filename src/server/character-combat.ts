import {
  calculateElementalDamage,
  calculateHpSteal,
  calculateMpSteal,
  type ElementalDamages,
  rollAttack,
  rollTriggers,
} from "@/shared/rules/combat";
import { rollSpellCrit, rollSpellDamage, type getAbilityDetails } from "@/shared/rules/spells";
import type { ServerCharacter } from "./character";

/** An ability's item data merged with its spell definition. */
export type AbilityDetails = ReturnType<typeof getAbilityDetails>;

/**
 * Legacy adapters for the pure combat and spell damage rules: roll the dice with `Math.random`,
 * then apply the outcome to the live characters (hp, buffs, aggro, death) in the same order as
 * before. Delete in Phase 4 when entities become plain data.
 *
 */

const rng = () => Math.random();

export function applyElementalDamage(eleDamages: ElementalDamages, victim: ServerCharacter) {
  return calculateElementalDamage(eleDamages, victim.stats, rng);
}

/** What happens to a victim that took damage: combat flag, dispels, and the mob targeting its attacker. */
function markHurt(attacker: ServerCharacter, victim: ServerCharacter) {
  victim.state.lastCombat = Date.now();
  victim.dispelBuffsByProperty("dispelInCombat");
  /* Npc aggro when they are hit or hit a player */
  victim.setLockedPlayerId(attacker?.id);
}

export function applySpellDamage(
  attacker: ServerCharacter,
  victim: ServerCharacter,
  abilityDetails: AbilityDetails | undefined,
): Array<Hit> {
  if (victim?.state?.isDead) return [];
  const hits: Array<Hit> = [];
  const { effects = {}, buffs } = abilityDetails ?? ({} as Partial<AbilityDetails>);

  const rolled = rollSpellDamage(effects, attacker?.stats, victim.stats, rng);
  const elements = rolled.elements as Elements[];
  let { eleDamage, holyDamage } = rolled;

  // add buffs if the spell has any
  if (buffs) {
    Object.entries(buffs as Record<string, number>).forEach(([name, level]) => {
      hits.push({
        type: "buff",
        from: attacker.id,
        buffName: name,
        elements,
        to: victim.id,
      });

      victim.addBuff({ name, level, caster: attacker });
    });
  }

  // the spell doesnt do damage,
  if (!Object.entries(effects)?.length) return hits;

  // Spell Crits
  const crit = rollSpellCrit({ eleDamage, holyDamage }, attacker.stats, rng);
  const { isCritical } = crit;
  eleDamage = crit.eleDamage;
  holyDamage = crit.holyDamage;

  if (Math.abs(holyDamage) > 0) {
    victim.modifyStat("hp", holyDamage);
    hits.push({
      type: "hp",
      amount: holyDamage,
      elements: ["holy"],
      from: attacker.id,
      to: victim.id,
      isCritical,
    });
  }
  if (Math.abs(eleDamage) > 0) {
    victim.modifyStat("hp", -eleDamage);
    markHurt(attacker, victim);
    /* Victim killed */
    if (victim.stats.hp <= 0) {
      victim.setDead();
      victim.stats.hp = 0;
      hits.push({
        type: "death",
        amount: -eleDamage,
        elements,
        from: attacker.id,
        to: victim.id,
        isCritical,
      });
      return hits;
    }
    hits.push({
      type: "hp",
      amount: -eleDamage,
      elements,
      from: attacker.id,
      to: victim.id,
      isCritical,
    });
  }

  return hits;
}

export function applyAttackDamage(
  attacker: ServerCharacter,
  victim: ServerCharacter,
  abilityDetails: AbilityDetails | undefined,
): Array<Hit> {
  if (victim?.state?.isDead) return [];

  const roll = rollAttack(attacker.stats, victim.stats, abilityDetails?.effects, rng);
  if (roll.outcome === "miss") {
    return [{ type: "miss", amount: 0, from: attacker.id, to: victim.id }];
  }
  if (roll.outcome === "block") {
    return [{ type: "block", amount: 0, from: attacker.id, to: victim.id }];
  }
  const { isCritical, physicalDamage, totalDamage } = roll;
  const elements = roll.elements as Elements[];

  const hits: Array<Hit> = [];
  victim.modifyStat("hp", -totalDamage);

  if (totalDamage > 0) markHurt(attacker, victim);

  // onAttackHit if we have some
  for (const { name, level, target } of rollTriggers(
    attacker?.stats?.triggers,
    "onAttackHit",
    rng,
  )) {
    const to = target === "self" ? attacker : victim;
    hits.push({ type: "buff", from: attacker.id, buffName: name, elements, to: to.id });
    to.addBuff({ name, level, caster: attacker });
  }
  // onHurt triggers if we have them
  for (const { name, level } of rollTriggers(victim?.stats?.triggers, "onHurt", rng)) {
    hits.push({ type: "buff", from: attacker.id, buffName: name, elements, to: victim.id });
    victim.addBuff({ name, level, caster: attacker });
  }

  /* Add stolen hp */
  const hpSteal = calculateHpSteal(physicalDamage, attacker?.stats?.hpSteal);
  if (hpSteal > 0) {
    attacker.modifyStat("hp", hpSteal);
    hits.push({ type: "hp", amount: hpSteal, from: victim.id, to: attacker.id });
  }
  /* Add stolen mp */
  const mpSteal = calculateMpSteal(physicalDamage, attacker?.stats?.mpSteal);
  if (mpSteal > 0) {
    attacker.modifyStat("mp", mpSteal);
    hits.push({ type: "mp", amount: mpSteal, from: victim.id, to: attacker.id });
  }

  /* Victim killed */
  if (victim.stats.hp <= 0) {
    victim.setDead();
    victim.stats.hp = 0;
    hits.push({
      type: "death",
      isCritical,
      amount: -totalDamage,
      elements,
      from: attacker.id,
      to: victim.id,
    });
    return hits;
  }
  hits.push({
    type: "hp",
    isCritical,
    amount: -totalDamage,
    elements,
    from: attacker.id,
    to: victim.id,
  });
  return hits;
}

/** An attack (no ability slot, or a melee attack-spell) or a spell hitting `victim`. */
export function applyDamage(
  attacker: ServerCharacter,
  victim: ServerCharacter,
  abilitySlot?: number,
): Array<Hit> {
  if (victim?.state?.isDead) return [];
  let hitList: Array<Hit>;
  const abilityDetails = attacker?.getAbilityDetails(abilitySlot);
  if (!abilitySlot || abilityDetails?.isMeleeAttack) {
    hitList = applyAttackDamage(attacker, victim, abilityDetails);
  } else {
    hitList = applySpellDamage(attacker, victim, abilityDetails);
  }
  // Casting stealth won't dispel anything.
  if (abilityDetails?.spellName !== "stealth") {
    attacker.dispelBuffsByProperty("dispelOnHit");
  }
  return hitList;
}
