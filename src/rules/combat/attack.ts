import { OUT_OF_COMBAT_MS, RACES_WITH_ATTACK_ANIMS } from "./constants";
import {
  hasRangedWeapon,
  hasRangedWeaponLeft,
  hasRangedWeaponRight,
  hasWeaponLeft,
  hasWeaponRight,
  isDualWielding,
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

/**
 * How long swing `count` takes to recover: each weapon has its own delay, so a dual-wielder's
 * left-hand swing (2) waits on the left weapon (`offHandAttackDelay`, see `calculateStats`).
 */
export function getSwingDelay(
  stats: { attackDelay: number; offHandAttackDelay?: number },
  count: number | undefined,
) {
  return (count === 2 && stats.offHandAttackDelay) || stats.attackDelay;
}

export interface AttackReadyInput {
  /** The delay of the last swing, from `getSwingDelay`. */
  attackDelay: number;
  lastAttack: number;
  now: number;
}

export function checkAttackReady({ attackDelay, lastAttack, now }: AttackReadyInput) {
  return getCooldown(attackDelay, lastAttack, now);
}

/** True once `OUT_OF_COMBAT_MS` have passed since the last damage dealt or taken. */
export function isOutOfCombat(lastCombat: number, now: number) {
  return now - lastCombat > OUT_OF_COMBAT_MS;
}

/**
 * Which swing comes next: dual-wielders alternate the right hand (1) and the left (2); everyone
 * else, and bows, always swing 1. Feeds `getAttackSpCost` so costs shown match the next swing.
 */
export function getNextAttackCount(lastAttackCount: number | undefined, character: WeaponHolder) {
  if (hasRangedWeapon(character) || !isDualWielding(character)) return 1;
  return lastAttackCount === 1 ? 2 : 1;
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

/** Whether a character has the resources for these costs. HP must stay above its cost, so paying can't kill. */
export function canAffordCosts(
  stats: { hp?: number; mp?: number; sp?: number } | null | undefined,
  costs: { hp?: number; mp?: number; sp?: number },
) {
  return (
    (stats?.mp ?? 0) >= (costs.mp ?? 0) &&
    (stats?.hp ?? 0) > (costs.hp ?? 0) &&
    hasStaminaFor(stats?.sp, costs.sp ?? 0)
  );
}

/** An attack needs the SP to pay for it: out of stamina, you can't attack until it regenerates. */
export function hasStaminaFor(sp: number | null | undefined, spCost: number) {
  return (sp ?? 0) >= spCost;
}

/**
 * What an attack's ability costs on top of the weapon's SP cost (`getAttackSpCost`, charged
 * separately). Missing costs are 0.
 */
export function getAbilityCosts(
  stats: { mpCost?: number; hpCost?: number; spCost?: number } | null | undefined,
) {
  return { mp: stats?.mpCost || 0, hp: stats?.hpCost || 0, sp: stats?.spCost || 0 };
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
