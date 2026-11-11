import { findSpell, spellDetails, type SpellDefinition } from "@/content";

/** A spell by name. An unknown name gets the plain melee attack, so a bad item still swings. */
export function getSpell(spellName: string | undefined): SpellDefinition {
  return findSpell(spellName) ?? spellDetails["attack-melee"];
}

/** Swings and dashes strike with the weapon in hand; everything else hits with the spell's own power. */
export function strikesWithWeapon(spell: SpellDefinition) {
  return spell.delivery.type === "swing" || spell.delivery.type === "dash";
}

/** Projectiles and dashes go where they are aimed; the rest happen where the caster stands. */
export function isAimed(spell: SpellDefinition) {
  return spell.delivery.type === "projectile" || spell.delivery.type === "dash";
}

/** Auras and swings ride their caster; the rest are left where they were cast. */
export function ridesCaster(spell: SpellDefinition) {
  return spell.delivery.type === "aura" || spell.delivery.type === "swing";
}

/** How big a spell is and how long it lasts, at a rank. */
export interface SpellShape {
  /** Radius of its hit area before `scale`. */
  size: number;
  /** How long it can hit, in ms; undefined for projectiles, which last until they land. */
  hitMs: number | undefined;
  visibleMs: number;
  /** -1 for spells that last by time rather than by how far they travel. */
  maxDistance: number;
  scale: number;
}

export function getSpellShape(spell: SpellDefinition, rank: number): SpellShape {
  const { delivery, look, scale } = spell;
  return {
    size: delivery.size,
    hitMs: delivery.type === "projectile" ? undefined : delivery.hitMs,
    visibleMs: look.visibleMs,
    maxDistance: (delivery.type === "projectile" && delivery.range) || -1,
    scale: (scale?.base ?? 1) + rank * (scale?.perRank ?? 0),
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
    : lifetime !== undefined && now - spawnTime > lifetime;
}

/** Velocity of a projectile flying at `angle` (radians). */
export function getSpellVelocity(angle: number, speed: number) {
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

/** How a projectile flies once cast. */
export interface SpellFlight {
  velocity: { x: number; y: number };
  /** How far it flies: its own range, or for arrows as far as the bow in the shooting hand. */
  maxDistance: number;
}

/**
 * The flight of a projectile cast at `castAngle`, or null for spells that don't fly.
 * `getWeaponRange` reads the caster's range with the weapon in a hand.
 */
export function getSpellFlight(
  spell: SpellDefinition,
  castAngle: number,
  action: string,
  getWeaponRange: (hand: "handLeft" | "handRight") => number,
): SpellFlight | null {
  const { delivery } = spell;
  if (delivery.type !== "projectile") return null;
  return {
    velocity: getSpellVelocity(castAngle, delivery.speed),
    maxDistance: delivery.range ?? getWeaponRange(usesLeftHand(action) ? "handLeft" : "handRight"),
  };
}

/** Where a melee swing hits from, and how far it reaches. */
export interface MeleeSwing {
  /** Height of the swing's centre; x is the caster's. */
  y: number;
  /** The swinging weapon's range, or undefined to keep the spell's own size. */
  reach?: number;
}

/**
 * A swing turns around the caster's body, or around its feet when swinging up (an upward reach
 * looks too long from above) and for non-humans. It reaches as far as the swinging hand's weapon.
 */
export function getMeleeSwing(
  caster: { y: number; bodyCenterY: number; direction?: string; race?: string },
  action: string,
  getWeaponRange: (hand: "handLeft" | "handRight") => number,
): MeleeSwing {
  const fromFeet = caster.direction === "up" || caster.race !== "human";
  const y = fromFeet ? caster.y : caster.y + caster.bodyCenterY;
  if (usesRightHand(action)) return { y, reach: getWeaponRange("handRight") };
  if (usesLeftHand(action)) return { y, reach: getWeaponRange("handLeft") };
  return { y };
}

/** Melee swings that hit with the left hand. */
export function usesLeftHand(action: string) {
  return action.includes("attack_left");
}

/** Melee swings that hit with the right hand; characters with no attack animation just "stand". */
export function usesRightHand(action: string) {
  return action.includes("attack_right") || action === "stand";
}
