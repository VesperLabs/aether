import { RANGE_MULTIPLIER, UNARMED_RANGE } from "./constants";

/** What a hand is holding. Only the fields the weapon rules read. */
export interface HeldItem {
  type?: string;
  stats?: { range?: number; spCost?: number } | null;
}

export interface HandEquipment {
  handLeft?: HeldItem | null;
  handRight?: HeldItem | null;
}

/** Which of a character's equipment sets to look at: what is shown, or everything worn. */
export type EquipmentKey = "visibleEquipment" | "equipment";

/** A character as far as the weapon queries go: its equipment and its race. */
export interface WeaponHolder {
  visibleEquipment?: HandEquipment | null;
  equipment?: HandEquipment | null;
  profile?: { race?: string } | null;
}

export type Hand = "handLeft" | "handRight";

const WEAPON_TYPES = ["weapon", "ranged"];

export function hasWeaponLeft(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return WEAPON_TYPES.includes(character?.[key]?.handLeft?.type as string);
}

/** Non-humans always count as armed in their right hand (their claws, teeth and so on). */
export function hasWeaponRight(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return (
    WEAPON_TYPES.includes(character?.[key]?.handRight?.type as string) ||
    (character.profile as { race?: string }).race !== "human"
  );
}

export function hasWeapon(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return hasWeaponLeft(character, key) || hasWeaponRight(character, key);
}

export function hasShieldLeft(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return character?.[key]?.handLeft?.type === "shield";
}

export function hasShieldRight(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return character?.[key]?.handRight?.type === "shield";
}

export function hasShield(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return hasShieldLeft(character, key) || hasShieldRight(character, key);
}

export function hasRangedWeaponLeft(
  character: WeaponHolder,
  key: EquipmentKey = "visibleEquipment",
) {
  return character?.[key]?.handLeft?.type === "ranged";
}

export function hasRangedWeaponRight(
  character: WeaponHolder,
  key: EquipmentKey = "visibleEquipment",
) {
  return character?.[key]?.handRight?.type === "ranged";
}

export function hasRangedWeapon(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return hasRangedWeaponLeft(character, key) || hasRangedWeaponRight(character, key);
}

export function hasMeleeWeaponLeft(
  character: WeaponHolder,
  key: EquipmentKey = "visibleEquipment",
) {
  return character?.[key]?.handLeft?.type === "weapon";
}

export function hasMeleeWeaponRight(
  character: WeaponHolder,
  key: EquipmentKey = "visibleEquipment",
) {
  return character?.[key]?.handRight?.type === "weapon";
}

export function hasMeleeWeapon(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return hasMeleeWeaponLeft(character, key) || hasMeleeWeaponRight(character, key);
}

export function isDualWielding(character: WeaponHolder, key: EquipmentKey = "visibleEquipment") {
  return hasWeaponLeft(character, key) && hasWeaponRight(character, key);
}

/** Double shields, or a bow together with anything else in the other hand, can't attack. */
export function hasAttackableWeapons(
  character: WeaponHolder,
  key: EquipmentKey = "visibleEquipment",
) {
  const hasRangedAndOther =
    hasRangedWeapon(character, key) &&
    (isDualWielding(character, key) || hasShield(character, key));
  const hasDoubleShields = hasShieldLeft(character, key) && hasShieldRight(character, key);
  if (hasRangedAndOther || hasDoubleShields) return false;
  return true;
}

/** Only "melee" is ever true: ranged requirements are not checked. */
export function hasVisibleWeaponType(
  character: WeaponHolder,
  weaponType: "melee" | "ranged",
  key: EquipmentKey = "visibleEquipment",
) {
  return (
    weaponType === "melee" && hasAttackableWeapons(character, key) && hasMeleeWeapon(character, key)
  );
}

/** Reach of the weapon in a hand, in pixels. Without a weapon range it's the body plus a little. */
export function getWeaponRange(
  character: Pick<WeaponHolder, "visibleEquipment"> & { bodySize: number },
  hand: Hand = "handLeft",
) {
  const weaponRange = character?.visibleEquipment?.[hand]?.stats?.range;
  if (weaponRange) {
    return (character?.visibleEquipment?.[hand]?.stats?.range || 1) * RANGE_MULTIPLIER;
  }
  return UNARMED_RANGE + character.bodySize;
}
