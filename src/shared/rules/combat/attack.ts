import { OUT_OF_COMBAT_MS, RACES_WITH_ATTACK_ANIMS } from "./constants";
import {
  hasRangedWeaponLeft,
  hasRangedWeaponRight,
  hasWeaponLeft,
  hasWeaponRight,
  type HandEquipment,
  type WeaponHolder,
} from "./weapons";

export interface Cooldown {
  /** Total length of the cooldown. */
  cooldown: number;
  timeRemaining: number;
  timeElapsed: number;
  percentageRemaining: number;
  isReady: boolean;
}

/** How far through a cooldown that started at `lastUsed` we are at `now`. */
export function getCooldown(cooldown: number, lastUsed: number, now: number): Cooldown {
  const timeElapsed = now - lastUsed;
  const timeRemaining = Math.max(cooldown - timeElapsed, 0);
  const percentageRemaining = (timeRemaining / cooldown) * 100;
  const isReady = percentageRemaining === 0;
  return { cooldown, timeRemaining, timeElapsed, percentageRemaining, isReady };
}

/** Dual wielding averages the weapon delay with a fast 60. */
export function getFullAttackDelay(attackDelay: number, isDualWielding: boolean) {
  return isDualWielding ? (attackDelay + 60) / 2 : attackDelay;
}

export interface AttackReadyInput {
  attackDelay: number;
  isDualWielding: boolean;
  lastAttack: number;
  now: number;
}

export function checkAttackReady({
  attackDelay,
  isDualWielding,
  lastAttack,
  now,
}: AttackReadyInput) {
  return getCooldown(getFullAttackDelay(attackDelay, isDualWielding), lastAttack, now);
}

/** True once `OUT_OF_COMBAT_MS` have passed since the last damage dealt or taken. */
export function isOutOfCombat(lastCombat: number, now: number) {
  return now - lastCombat > OUT_OF_COMBAT_MS;
}

/** SP an attack costs. Count 1 is the right hand (or the left if it has none), 2 is the left. */
export function getAttackSpCost(visibleEquipment: HandEquipment | null | undefined, count: number) {
  if (count === 1) {
    return (
      visibleEquipment?.handRight?.stats?.spCost || visibleEquipment?.handLeft?.stats?.spCost || 0
    );
  }
  if (count === 2) {
    return visibleEquipment?.handLeft?.stats?.spCost || 0;
  }
  return 1;
}

export interface AttackActionInput {
  /** What the character is doing now (kept when it can't animate an attack). */
  action: string;
  /** The ability being used, already looked up (see `getAbilityDetails`). */
  ability?: Record<string, any>;
  count: number;
}

export type AttackAction = { action: string; spellName: string } & Record<string, any>;

/** Which hand swings, and which spell the swing is, for attack number `count` (1 or 2). */
export function getAttackActionName(
  character: WeaponHolder,
  { action: currentAction, ability, count }: AttackActionInput,
): AttackAction {
  let spellName = "attack-melee";
  let action = currentAction;

  if (!RACES_WITH_ATTACK_ANIMS.includes((character.profile as { race: string }).race)) {
    return { action, spellName };
  }

  if (count === 1) {
    if (hasWeaponRight(character)) {
      action = "attack_right";
      spellName =
        ability?.base ?? (hasRangedWeaponRight(character) ? "attack-ranged" : "attack-melee");
    } else if (hasWeaponLeft(character)) {
      action = "attack_left";
      spellName =
        ability?.base ?? (hasRangedWeaponLeft(character) ? "attack-ranged" : "attack-melee");
    }
  } else if (count === 2 && hasWeaponLeft(character)) {
    action = "attack_left";
    spellName =
      ability?.base ?? (hasRangedWeaponRight(character) ? "attack-ranged" : "attack-melee");
  }

  return { ...ability, action, spellName };
}
