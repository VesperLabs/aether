import { findSpell } from "@/content";
import { distanceBetween, type Body } from "./range";
import { NPC_SHOT_MARGIN } from "./constants";

/**
 * How far, centre to centre, an NPC can stand from its target and still land a shot. Every NPC
 * range check for spells and ranged weapons goes through this, so "where it stands" and "can the
 * shot reach" can never disagree.
 */
export interface ShotBand {
  min: number;
  max: number;
}

/** Default body radius on each side, which the old edge-to-edge `npcRange` left out. */
const BODY_RADII = 16;

/**
 * Where an attack spell can land from: its `npcRange`, capped by how far a projectile flies
 * (with a margin for a target on the move). Undefined for spells that don't target enemies.
 */
export function getSpellBand(spellName: string | undefined): ShotBand | undefined {
  const spell = findSpell(spellName);
  if (!spell?.targets.includes("enemy") || !spell.npcRange) return undefined;
  const [min, max] = spell.npcRange;
  const { delivery } = spell;
  if (delivery.type !== "projectile") {
    // Spells starting at the caster (quake, tackle): the range is edge to edge
    return { min: min + BODY_RADII, max: max + BODY_RADII };
  }
  return { min, max: Math.min(max, (delivery.range ?? Infinity) * NPC_SHOT_MARGIN) };
}

/** Where a ranged weapon can land from: its arrows fly `range` from the shooter. */
export function getWeaponBand(range: number): ShotBand {
  return { min: 0, max: range * NPC_SHOT_MARGIN };
}

export function isInBand(self: Body, target: Body | null | undefined, band: ShotBand) {
  if (!target) return false;
  const distance = distanceBetween(self, target);
  return distance >= band.min && distance <= band.max;
}

/** Where to stand inside a band: the middle, so a step either way keeps the shot. */
export function getIdealDistance(band: ShotBand) {
  return (band.min + band.max) / 2;
}
