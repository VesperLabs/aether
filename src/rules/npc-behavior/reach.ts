import { spellDetails } from "@/content";
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

type Details = {
  allowedTargets?: readonly string[];
  npcCastRange?: readonly [number, number];
  isMissile?: boolean;
  isRangedAttack?: boolean;
  maxDistance?: number;
  maxActiveTime?: number;
  spellSpeed?: number;
};

/** Default body radius on each side, which the old edge-to-edge `npcCastRange` left out. */
const BODY_RADII = 16;

const detailsOf = (spellName?: string) =>
  (spellDetails as unknown as Record<string, Details>)?.[spellName as string];

/** How far a projectile flies before it vanishes, by distance or by lifetime. */
function getFlightDistance(details: Details) {
  if (details.maxDistance !== undefined && details.maxDistance > -1) return details.maxDistance;
  if (details.spellSpeed && details.maxActiveTime) {
    return (details.spellSpeed * details.maxActiveTime) / 1000;
  }
  return Infinity;
}

/**
 * Where an attack spell can land from: its `npcCastRange`, capped by how far it actually flies
 * (with a margin for a target on the move). Undefined for spells that don't target enemies.
 */
export function getSpellBand(spellName: string | undefined): ShotBand | undefined {
  const details = detailsOf(spellName);
  if (!details?.allowedTargets?.includes("enemy") || !details.npcCastRange) return undefined;
  const [min, max] = details.npcCastRange;
  if (!details.isMissile && !details.isRangedAttack) {
    // Area spells around the caster (quake): the range is edge to edge
    return { min: min + BODY_RADII, max: max + BODY_RADII };
  }
  return { min, max: Math.min(max, getFlightDistance(details) * NPC_SHOT_MARGIN) };
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
