import { NPC_SHOULD_ATTACK_RANGE } from "./constants";

/** Anything with a position and, optionally, a body radius. */
export interface Body {
  x: number;
  y: number;
  bodySize?: number;
}

export function distanceBetween(first: Body | null | undefined, second: Body | null | undefined) {
  const dx = (second?.x as number) - (first?.x as number);
  const dy = (second?.y as number) - (first?.y as number);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Edge-to-edge distance within `range`? (`undefined` when there is no target.) */
export function checkInRange(self: Body, target: Body | null | undefined, range: number) {
  if (!target) return;
  const thisRadius = self?.bodySize || 8;
  const targetRadius = target?.bodySize || 8;
  const distance = distanceBetween(self, target) - (thisRadius + targetRadius);
  return distance <= range;
}

/** The range of a ranged weapon in a hand, present only for hands holding one. */
export interface NpcWeaponRanges {
  handLeft?: { range: number } | null;
  handRight?: { range: number } | null;
}

/** How close an NPC must be to attack: its ranged weapon's range, else melee. */
export function getShouldAttackRange(weapons: NpcWeaponRanges | null | undefined) {
  if (weapons?.handLeft) return weapons.handLeft.range;
  if (weapons?.handRight) return weapons.handRight.range;
  /* TODO: melee attack range too? */
  return NPC_SHOULD_ATTACK_RANGE;
}
