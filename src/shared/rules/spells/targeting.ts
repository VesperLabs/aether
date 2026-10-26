export type SpellTargets = readonly string[] | undefined;

export interface PlayerTargetInput {
  allowedTargets: SpellTargets;
  /** The target is the caster. */
  isSelf: boolean;
  /** The target is in the caster's party (true for the caster too when partied). */
  isPartyMember: boolean;
}

/** Spells that allow enemies can hit mobs; mobs are never allies or self targets of a player. */
export function canHitNpc(allowedTargets: SpellTargets) {
  return Boolean(allowedTargets?.includes("enemy"));
}

/**
 * May the spell hit this player? Self needs "self", an outsider needs "enemy", and a party member
 * other than the caster needs "ally".
 */
export function canHitPlayer({ allowedTargets, isSelf, isPartyMember }: PlayerTargetInput) {
  if (!allowedTargets?.includes("self") && isSelf) return false;
  if (!allowedTargets?.includes("enemy") && !isSelf && !isPartyMember) return false;
  if (!allowedTargets?.includes("ally") && isPartyMember && !isSelf) return false;
  return true;
}

export interface VictimCheckInput {
  victimId: string;
  victimIsDead: boolean;
  /** Ids this spell has already hit. */
  hitIds: readonly string[];
  allowedTargets: SpellTargets;
  casterId: string;
  /** A single-target spell only ever hits this one. */
  targetId?: string;
}

/** Is this character worth testing for a collision with the spell? */
export function isSpellVictimCandidate({
  victimId,
  victimIsDead,
  hitIds,
  allowedTargets,
  casterId,
  targetId,
}: VictimCheckInput) {
  if (hitIds.includes(victimId) || victimIsDead) return false;
  if (!allowedTargets?.includes("self") && victimId === casterId) return false;
  if (targetId && victimId !== targetId) return false;
  return true;
}

export interface Point {
  x: number;
  y: number;
}

/** Melee swings can't hit what is behind the caster. */
export function isBehindCaster(direction: string | undefined, victim: Point, caster: Point) {
  if (direction === "up" && victim.y > caster.y) return true;
  if (direction === "down" && victim.y < caster.y) return true;
  if (direction === "left" && victim.x > caster.x) return true;
  if (direction === "right" && victim.x < caster.x) return true;
  return false;
}
