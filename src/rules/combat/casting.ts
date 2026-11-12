import { getCharacterDirection, type CardinalDirection } from "@/rules/world";

/*
 * Timed casts: a spell that fires `castMs` after it starts. The caster is rooted for the whole cast
 * and faces where it aims, until the spell fires or something calls it off. The server runs these
 * for every caster (players now, bots later), so they all stand and turn the same way.
 */

/** A spell being cast: it fires at `landsAt` unless something cancels it first. */
export interface PendingCast<Slot = number | string> {
  abilitySlot: Slot;
  landsAt: number;
  roomName?: string;
}

/** What starting a cast needs to know about the caster. */
export interface CastStart {
  isCasting: boolean;
  isMoving: boolean;
  canAfford: boolean;
  roomName?: string;
  castMs?: number;
}

/** The cast to start, or undefined when it is refused: already casting, moving, short or nowhere. */
export function beginCast<Slot>(
  abilitySlot: Slot,
  { isCasting, isMoving, canAfford, roomName, castMs }: CastStart,
  now: number,
): PendingCast<Slot> | undefined {
  if (!roomName || !castMs || isCasting || isMoving || !canAfford) return undefined;
  return { abilitySlot, landsAt: now + castMs, roomName };
}

/** What can happen to a cast this tick. */
export type CastStep = "wait" | "cancel" | "land";

/** A stun, death or room change calls the cast off; otherwise it lands once its time is up. */
export function stepCast(
  cast: PendingCast<unknown>,
  caster: { isDead?: boolean; isStunned: boolean; roomName?: string },
  now: number,
): CastStep {
  if (caster.isDead || caster.isStunned || caster.roomName !== cast.roomName) return "cancel";
  return now < cast.landsAt ? "wait" : "land";
}

/** A caster mid-cast can't walk: there are no walking cast animations. */
export function isCastRooted(cast: PendingCast<unknown> | undefined) {
  return !!cast;
}

/** The way a caster's body faces while it aims a cast at `angle` (radians). */
export function getCastFacing(angle: number): CardinalDirection {
  return getCharacterDirection({ x: 0, y: 0 }, { x: Math.cos(angle), y: Math.sin(angle) });
}
