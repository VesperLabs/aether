import type { AbilitySlot } from "@/rules/spells";
import {
  calculateElementalDamage,
  calculateDrains,
  isInStealthGrace,
  type ElementalDamages,
  rollAttack,
  rollTriggers,
  type Hand,
} from "@/rules/combat";
import { isDodgeInvulnerable } from "@/rules/movement";
import { rollSpellCrit, rollSpellDamage, type getAbilityDetails } from "@/rules/spells";
import type { ServerCharacter } from "./character";
import { isAlly } from "./allegiance-adapter";

/** An ability's item data merged with its spell definition. */
export type AbilityDetails = ReturnType<typeof getAbilityDetails>;

/**
 * Legacy adapters for the pure combat and spell damage rules: roll the dice with the world RNG (`world.rng`),
 * then apply the outcome to the live characters (hp, buffs, aggro, death) in the same order as
 * before. Delete in Phase 4 when entities become plain data.
 *
 */

/** Rolling (and just after), or just after going into stealth: hits miss. */
function cannotBeHit(victim: ServerCharacter) {
  const now = victim.world.now();
  return isDodgeInvulnerable(victim.state, now) || isInStealthGrace(victim.state, now);
}

/** Self or anyone on its side (party, companions, fellow wild NPCs): holy heals instead of hurts. */
function isAllyOf(attacker: ServerCharacter, victim: ServerCharacter) {
  return attacker === victim || isAlly(attacker.world, attacker, victim);
}

export function applyElementalDamage(eleDamages: ElementalDamages, victim: ServerCharacter) {
  return calculateElementalDamage(eleDamages, victim.stats, victim.world.rng);
}

/** What happens to a victim that took damage: combat flag, dispels, and the mob targeting its attacker. */
function markHurt(attacker: ServerCharacter, victim: ServerCharacter, amount: number) {
  victim.state.lastCombat = victim.world.now();
  victim.dispelBuffsByProperty("dispelInCombat");
  /* The first hit pulls an NPC; after that its threat table decides who it fights. */
  /* Players are filed under their socket id, NPCs under their id. */
  const attackerId = attacker.socketId || attacker.id;
  if (!victim.state.lockedPlayerId && attacker !== victim) victim.setLockedPlayerId(attackerId);
  victim.world?.events?.emit("characterDamaged", {
    victimId: victim.id,
    attackerId,
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

  const rolled = rollSpellDamage(effects, attacker?.stats, victim.stats, victim.world.rng);
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
  const crit = rollSpellCrit({ eleDamage, holyDamage }, attacker.stats, victim.world.rng);
  const { isCritical } = crit;
  eleDamage = crit.eleDamage;
  holyDamage = crit.holyDamage;

  /* Holy heals allies; on enemies it hurts like any other element (ignoring resistances) */
  if (holyDamage > 0 && isAllyOf(attacker, victim)) {
    victim.modifyStat("hp", holyDamage);
    hits.push({
      type: "hp",
      amount: holyDamage,
      elements: ["holy"],
      from: attacker.id,
      to: victim.id,
      isCritical,
    });
  } else if (holyDamage > 0) {
    eleDamage += holyDamage;
    elements.push("holy");
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
  hand?: Hand,
): Array<Hit> {
  if (victim?.state?.isDead) return [];
  if (cannotBeHit(victim)) {
    return [{ type: "miss", amount: 0, from: attacker.id, to: victim.id }];
  }

  /* A dual-wielder's left-hand swing uses that weapon's stats, never both weapons' */
  const swingStats = (hand === "handLeft" && attacker.offHandStats) || attacker.stats;
  const roll = rollAttack(swingStats, victim.stats, abilityDetails?.effects, victim.world.rng);
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

  /* Buffs the attack-spell casts (tackle's stun) land with the hit, as a spell's do */
  for (const [name, level] of Object.entries(
    (abilityDetails?.buffs ?? {}) as Record<string, number>,
  )) {
    hits.push({ type: "buff", from: attacker.id, buffName: name, elements, to: victim.id });
    victim.addBuff({ name, level, caster: attacker });
  }

  // onAttackHit if we have some
  for (const { name, level, target } of rollTriggers(
    swingStats?.triggers,
    "onAttackHit",
    victim.world.rng,
  )) {
    const to = target === "self" ? attacker : victim;
    hits.push({ type: "buff", from: attacker.id, buffName: name, elements, to: to.id });
    to.addBuff({ name, level, caster: attacker });
  }
  // onHurt triggers if we have them
  for (const { name, level } of rollTriggers(victim?.stats?.triggers, "onHurt", victim.world.rng)) {
    hits.push({ type: "buff", from: attacker.id, buffName: name, elements, to: victim.id });
    victim.addBuff({ name, level, caster: attacker });
  }

  /* Drained hp, mp and sp flow from the victim to the attacker */
  for (const { resource, amount } of calculateDrains(physicalDamage, swingStats)) {
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
  hand?: Hand,
): Array<Hit> {
  if (victim?.state?.isDead) return [];
  let hitList: Array<Hit>;
  const abilityDetails = attacker?.getAbilityDetails(abilitySlot);
  if (!abilitySlot || abilityDetails?.isMeleeAttack || abilityDetails?.isLunge) {
    hitList = applyAttackDamage(attacker, victim, abilityDetails, hand);
  } else {
    hitList = applySpellDamage(attacker, victim, abilityDetails);
  }
  // Casting stealth won't dispel anything.
  if (abilityDetails?.spellName !== "stealth") {
    attacker.dispelBuffsByProperty("dispelOnHit");
  }
  return hitList;
}
