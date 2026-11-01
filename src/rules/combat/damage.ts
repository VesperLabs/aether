import { mergeAndAddValues, type StatBag } from "@/rules/stats";
import { randomInt, type Rng } from "@/rules/loot";

/** Elemental damage ranges, e.g. `minFireDamage` / `maxFireDamage`. Missing ones count as 0. */
export type ElementalDamages = Record<string, number | undefined>;

export interface ElementalResult {
  /** Fire, light, water and earth damage after the victim's resistances. */
  eleDamage: number;
  /** Holy damage ignores resistances. */
  holyDamage: number;
  /** The elements that did damage, strongest first. */
  elements: string[];
}

/** Rolls each element's damage range and applies the victim's resistances (a percentage). */
export function calculateElementalDamage(
  eleDamages: ElementalDamages,
  victimStats: StatBag,
  rng: Rng,
): ElementalResult {
  const {
    minFireDamage = 0,
    maxFireDamage = 0,
    minLightDamage = 0,
    maxLightDamage = 0,
    minWaterDamage = 0,
    maxWaterDamage = 0,
    minEarthDamage = 0,
    maxEarthDamage = 0,
    minHolyDamage = 0,
    maxHolyDamage = 0,
  } = eleDamages;

  const fireDamageRoll = randomInt(rng, minFireDamage, maxFireDamage);
  const lightDamageRoll = randomInt(rng, minLightDamage, maxLightDamage);
  const waterDamageRoll = randomInt(rng, minWaterDamage, maxWaterDamage);
  const earthDamageRoll = randomInt(rng, minEarthDamage, maxEarthDamage);
  const holyDamageRoll = randomInt(rng, minHolyDamage, maxHolyDamage);

  const fireResistance = (victimStats.fireResistance || 0) / 100;
  const lightResistance = (victimStats.lightResistance || 0) / 100;
  const waterResistance = (victimStats.waterResistance || 0) / 100;
  const earthResistance = (victimStats.earthResistance || 0) / 100;

  const fireDamageAfterReduction = fireDamageRoll * (1 - fireResistance);
  const lightDamageAfterReduction = lightDamageRoll * (1 - lightResistance);
  const waterDamageAfterReduction = waterDamageRoll * (1 - waterResistance);
  const earthDamageAfterReduction = earthDamageRoll * (1 - earthResistance);

  const holyDamage = Math.floor(holyDamageRoll);

  const eleDamage = Math.floor(
    fireDamageAfterReduction +
      lightDamageAfterReduction +
      waterDamageAfterReduction +
      earthDamageAfterReduction,
  );

  const elements: { type: string; damage: number }[] = [];
  if (fireDamageAfterReduction > 0)
    elements.push({ type: "fire", damage: fireDamageAfterReduction });
  if (lightDamageAfterReduction > 0) {
    elements.push({ type: "light", damage: lightDamageAfterReduction });
  }
  if (waterDamageAfterReduction > 0) {
    elements.push({ type: "water", damage: waterDamageAfterReduction });
  }
  if (earthDamageAfterReduction > 0) {
    elements.push({ type: "earth", damage: earthDamageAfterReduction });
  }
  elements.sort((a, b) => b.damage - a.damage);

  return { eleDamage, holyDamage, elements: elements.map((d) => d.type) };
}

/** Weapon damage, rolled between min and max. Stamina doesn't weaken attacks; it gates them. */
export function calculateWeaponDamage(attacker: StatBag, rng: Rng): number {
  const min = attacker.minDamage || 0;
  return randomInt(rng, min, Math.max(min, attacker.maxDamage || 0));
}

export type AttackRoll =
  | { outcome: "miss" }
  | { outcome: "block" }
  | {
      outcome: "hit";
      isCritical: boolean;
      /** Whole points of weapon damage, after defense and crits. */
      physicalDamage: number;
      eleDamage: number;
      /** "physical" first (if any), then the elements that hit, strongest first. */
      elements: string[];
      totalDamage: number;
    };

/**
 * Resolves one weapon attack: dodge, block, crit, then damage. Rolls dodge, block and crit
 * in that order whatever happens, then the elemental rolls only if the attack lands.
 * `effects` are extra stats from an attack-spell (like flame-slash) added to the attacker's.
 */
export function rollAttack(
  attacker: StatBag,
  victim: StatBag,
  effects: StatBag | undefined,
  rng: Rng,
): AttackRoll {
  const mergedStats = mergeAndAddValues(attacker, effects);

  const dodgeRoll = randomInt(rng, 1, 100);
  const blockRoll = randomInt(rng, 1, 100);
  const critRoll = randomInt(rng, 1, 100);

  const damage = calculateWeaponDamage(attacker, rng);

  const defense = Math.max(1, victim.defense || 1);
  const armorPierce = Math.max(1, attacker.armorPierce || 1);
  const reduction = Math.min(1, armorPierce / defense);
  const dodgeChance = Math.max(0, victim.dodgeChance - attacker.accuracy);

  let isCritical = false;
  let physicalDamage = Math.max(1, damage * reduction);
  if (dodgeRoll < dodgeChance) return { outcome: "miss" };
  if (blockRoll < victim.blockChance) return { outcome: "block" };
  if (attacker.critChance && critRoll <= attacker.critChance) {
    isCritical = true;
    physicalDamage = Math.max(1, physicalDamage * (attacker.critMultiplier || 1));
  }

  const { eleDamage, elements } = calculateElementalDamage(mergedStats, victim, rng);

  physicalDamage = Math.floor(physicalDamage);
  if (physicalDamage > 0) elements.unshift("physical");

  return {
    outcome: "hit",
    isCritical,
    physicalDamage,
    eleDamage,
    elements,
    totalDamage: physicalDamage + eleDamage,
  };
}
