import { spellDetails, type SpellDefinition } from "@/shared/content";

export interface ResolvedSpell {
  details: SpellDefinition;
  /** False when the name was unknown and the plain melee attack was used instead. */
  found: boolean;
}

/** A spell's definition. An unknown spell falls back to the plain melee attack. */
export function resolveSpellDetails(spellName: string): ResolvedSpell {
  const details = (spellDetails as Record<string, SpellDefinition>)?.[spellName];
  if (!details) return { details: spellDetails["attack-melee"], found: false };
  return { details, found: true };
}

/** How a spell moves and how big it is, from its definition. */
export interface SpellShape {
  isMeleeAttack?: boolean;
  isRangedAttack?: boolean;
  isMissile: boolean;
  allowedTargets?: readonly string[];
  maxActiveTime?: number;
  maxVisibleTime?: number;
  bodySize?: number;
  spellSpeed?: number;
  /** -1 for spells that last by time rather than by how far they travel. */
  maxDistance: number;
  /** Scale of the spell at item level `ilvl`. */
  scale: number;
}

export function getSpellShape(details: SpellDefinition | undefined, ilvl: number): SpellShape {
  const scaleBase = details?.scaleBase ?? 1;
  const scaleMultiplier = details?.scaleMultiplier ?? 0;
  return {
    isMeleeAttack: details?.isMeleeAttack,
    isRangedAttack: details?.isRangedAttack,
    isMissile: details?.isMissile ?? false,
    allowedTargets: details?.allowedTargets,
    maxActiveTime: details?.maxActiveTime,
    maxVisibleTime: details?.maxVisibleTime,
    bodySize: details?.bodySize,
    spellSpeed: details?.spellSpeed,
    maxDistance: details?.maxDistance ?? -1,
    scale: scaleBase + ilvl * scaleMultiplier,
  };
}

export interface SpellLifeInput {
  /** The spell's `maxDistance`; -1 means it expires by time. */
  maxDistance: number;
  /** How far the spell is from where it started. */
  distanceFromSpawn: number;
  spawnTime: number;
  /** How long it lasts, in ms (`maxActiveTime` on the server, `maxVisibleTime` for display). */
  lifetime: number | undefined;
  now: number;
}

/** A travelling spell is done once it has gone `maxDistance`; any other once its time is up. */
export function isSpellExpired({
  maxDistance,
  distanceFromSpawn,
  spawnTime,
  lifetime,
  now,
}: SpellLifeInput) {
  return maxDistance > -1
    ? distanceFromSpawn >= maxDistance
    : now - spawnTime > (lifetime as number);
}

/** Velocity of a projectile flying at `angle` (radians). */
export function getSpellVelocity(angle: number, speed: number | undefined) {
  return { x: Math.cos(angle) * (speed as number), y: Math.sin(angle) * (speed as number) };
}

/** Melee swings that hit with the left hand. */
export function usesLeftHand(action: string) {
  return action.includes("attack_left");
}

/** Melee swings that hit with the right hand; characters with no attack animation just "stand". */
export function usesRightHand(action: string) {
  return action.includes("attack_right") || action === "stand";
}
