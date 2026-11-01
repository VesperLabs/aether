import type { AbilitySlot } from "@/rules/spells";
import {
  calculateElementalDamage,
  calculateDrains,
  isInStealthGrace,
  type ElementalDamages,
  rollAttack,
  rollTriggers,
} from "@/rules/combat";
import { isDodgeInvulnerable } from "@/rules/movement";
import { rollSpellCrit, rollSpellDamage, type getAbilityDetails } from "@/rules/spells";
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

/** Rolling (and just after), or just after going into stealth: hits miss. */
function cannotBeHit(victim: ServerCharacter) {
  const now = victim.world.now();
  return isDodgeInvulnerable(victim.state, now) || isInStealthGrace(victim.state, now);
}

export function applyElementalDamage(eleDamages: ElementalDamages, victim: ServerCharacter) {
  return calculateElementalDamage(eleDamages, victim.stats, rng);
}

/** What happens to a victim that took damage: combat flag, dispels, and the mob targeting its attacker. */
function markHurt(attacker: ServerCharacter, victim: ServerCharacter, amount: number) {
  victim.state.lastCombat = victim.world.now();
  victim.dispelBuffsByProperty("dispelInCombat");
  /* The first hit pulls an NPC; after that its threat table decides who it fights. */
  if (!victim.state.lockedPlayerId) victim.setLockedPlayerId(attacker?.socketId);
  victim.world?.events?.emit("characterDamaged", {
    victimId: victim.id,
    attackerId: attacker.id,
    attackerSocketId: attacker.socketId,
    amount,
  });
}

export function applySpellDamage(
  attacker: ServerCharacter,
  victim: ServerCharacter,
  abilityDetails: AbilityDetails | undefined,
): Array<Hit> {
  if (victim?.state?.isDead) return [];
  if (attacker !== victim && cannotBeHit(victim)) {
    return [{ type: "miss", amount: 0, from: attacker.id, to: victim.id }];
  }
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
    markHurt(attacker, victim, Math.abs(eleDamage));
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
  if (cannotBeHit(victim)) {
    return [{ type: "miss", amount: 0, from: attacker.id, to: victim.id }];
  }

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

  if (totalDamage > 0) markHurt(attacker, victim, totalDamage);

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

  /* Drained hp, mp and sp flow from the victim to the attacker */
  for (const { resource, amount } of calculateDrains(physicalDamage, attacker?.stats)) {
    attacker.modifyStat(resource, amount);
    hits.push({ type: resource, amount, isDrain: true, from: victim.id, to: attacker.id });
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

/** An attack (no ability slot, a melee attack-spell or a lunge) or a spell hitting `victim`. */
export function applyDamage(
  attacker: ServerCharacter,
  victim: ServerCharacter,
  abilitySlot?: AbilitySlot,
): Array<Hit> {
  if (victim?.state?.isDead) return [];
  let hitList: Array<Hit>;
  const abilityDetails = attacker?.getAbilityDetails(abilitySlot);
  if (!abilitySlot || abilityDetails?.isMeleeAttack || abilityDetails?.isLunge) {
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
