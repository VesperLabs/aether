import { getSetBonus } from "@/content";
import { PLAYER_BASE_EXP } from "./exp";
import { classAttributes } from "./class-attributes";
import { finishDamage } from "./damage-stats";
import { isSwingStat } from "./swing-stats";
import {
  CRIT_PER_DEXTERITY,
  DODGE_PER_DEXTERITY,
  HP_PER_VITALITY,
  MAX_AVOIDANCE,
  MAX_RESISTANCE,
  RESISTANCES,
  SPELL_POWER_PER_INTELLIGENCE,
  SP_PER_VITALITY,
} from "./scaling";

/** An open-ended bag of stat name -> value. Also carries `triggers` once calculated. */
export type StatBag = Record<string, any>;

/** The part of an item (equipment piece or ability) that affects stats. */
interface StatsItem {
  key?: string;
  /** "weapon", "ranged", "shield", ...: decides how a held item counts (see `calculateStats`). */
  type?: string;
  setName?: string;
  stats?: Record<string, number>;
  percentStats?: Record<string, number>;
  triggers?: unknown[];
}

interface StatsBuff {
  stats?: Record<string, number>;
  percentStats?: Record<string, number>;
}

/** Everything `calculateStats` reads. Plain data: a character's fields, not the character. */
export interface StatsInput {
  baseStats: StatBag;
  /** Current stats. Only hp, mp, sp and exp are carried over. */
  stats: StatBag;
  equipment?: Record<string, StatsItem | null | undefined>;
  abilities?: Record<string, StatsItem | null | undefined>;
  buffs?: StatsBuff[];
  /** Slots that are actually in use. Items in other slots are ignored. */
  activeItemSlots?: string[];
}

export interface StatsResult {
  /** Stats for the main hand's swings (the right, or the left when only it holds a weapon). */
  stats: StatBag;
  /** Dual-wielding only: stats for the left hand's swings. */
  offHandStats?: StatBag;
  activeSets: string[];
}

const PLAYER_BASE_ATTACK_DELAY = 100;
type CharClass = "mage" | "warrior" | "rogue" | "cleric";

/** Sum two stat bags key by key. Keys in only one bag are kept as they are. */
export function mergeAndAddValues(obj1: StatBag = {}, obj2: StatBag = {}): StatBag {
  const result: StatBag = {};

  for (const key in obj1) {
    if (Object.hasOwn(obj1, key) && Object.hasOwn(obj2, key)) {
      result[key] = obj1[key] + obj2[key];
    } else {
      result[key] = obj1[key];
    }
  }

  for (const key in obj2) {
    if (!Object.hasOwn(obj1, key)) {
      result[key] = obj2[key];
    }
  }

  return result;
}

/** Copy `obj1`, adding in the values of `obj2` for keys `obj1` already has. */
export function addValuesToExistingKeys(
  obj1: Record<string, number>,
  obj2: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};

  Object.keys(obj1).forEach((key) => {
    result[key] = obj1[key];
  });

  Object.keys(result).forEach((key) => {
    if (Object.hasOwn(obj2, key)) {
      result[key] += obj2[key];
    }
  });

  return result;
}

/** Base stats for a brand new character of this class and level. */
export function getBaseStats({ level = 1, charClass }: { level?: number; charClass?: string }) {
  const isWarrior = charClass === ("warrior" satisfies CharClass);

  return {
    level,
    walkSpeed: 100,
    accuracy: 0,
    attackDelay: PLAYER_BASE_ATTACK_DELAY,
    spellPower: 0,
    castDelay: 1000,
    armorPierce: 0,
    ...classAttributes(level, charClass),
    defense: 0,
    blockChance: 0,
    critChance: 0,
    critMultiplier: 2,
    dodgeChance: 0,
    maxDamage: 0,
    minDamage: 0,
    magicFind: 1,
    regenHp: 1,
    regenMp: 1,
    regenSp: 1,
    maxHp: 30,
    maxMp: 10,
    maxSp: 20,
    maxExp: PLAYER_BASE_EXP,
    ...(isWarrior ? { fireResistance: 10 } : {}),
  };
}

function addTo(target: StatBag, key: string, amount: number | undefined) {
  if (!target[key]) target[key] = 0;
  if (amount) target[key] += amount;
}

const HANDS = ["handLeft", "handRight"];
const WEAPON_TYPES = ["weapon", "ranged"];

function heldItem(player: StatsInput, hand: string) {
  return player.activeItemSlots?.includes(hand) ? player.equipment?.[hand] : undefined;
}

/**
 * Work out a character's full stats from its base stats, gear, abilities, set bonuses and buffs.
 * Does not change its input: the caller stores `stats`, `offHandStats` and `activeSets`.
 *
 * Each weapon is its own: a dual-wielder's swings use one hand's weapon (its damage, delay,
 * effects, triggers), never both. Block chance only counts with a shield in hand.
 */
export function calculateStats(player: StatsInput, shouldHeal = false): StatsResult {
  const isDualWielding = HANDS.every((hand) =>
    WEAPON_TYPES.includes(heldItem(player, hand)?.type ?? ""),
  );
  if (!isDualWielding) return calculateHandStats(player, shouldHeal);

  const main = calculateHandStats(player, shouldHeal, "handLeft");
  const off = calculateHandStats(player, shouldHeal, "handRight");
  main.stats.offHandAttackDelay = off.stats.attackDelay;
  return { ...main, offHandStats: off.stats };
}

/** `calculateStats` for one hand's swings: the weapon in `skipHand` gives no swing stats or triggers. */
function calculateHandStats(
  player: StatsInput,
  shouldHeal: boolean,
  skipHand?: string,
): StatsResult {
  const { equipment = {}, abilities = {}, buffs = [] } = player;
  // disregard items that are not actively equipped
  const allSlots = Object.keys({ ...abilities, ...equipment }).filter((slot) =>
    player.activeItemSlots?.includes(slot),
  );
  const totalPercentStats: StatBag = {};
  const ns: StatBag = JSON.parse(JSON.stringify(player.baseStats));
  const setList: Record<string, number> = {};
  const activeSets: string[] = [];

  const current = Object.keys(player.stats).length ? player.stats : { hp: 0, mp: 0, sp: 0, exp: 0 };

  if (!ns.triggers) {
    ns.triggers = [];
  }

  /* Get stats from equipped abilities and items */
  allSlots.forEach((eKey) => {
    const item = abilities[eKey] || equipment[eKey];
    if (item) {
      if (item.setName) {
        if (setList[item.setName]) {
          let amountThisItem = 0;
          allSlots.forEach((aKey) => {
            const aItem = abilities[aKey] || equipment[aKey];
            if (aItem && aItem.key == item.key) {
              amountThisItem++;
            }
          });
          if (amountThisItem == 1) {
            setList[item.setName]++;
          }
        } else {
          setList[item.setName] = 1;
        }
      }
      /* The other hand's weapon still gives what isn't about swinging (spell power, cast speed) */
      const isOtherHand = eKey === skipHand;
      if (item.percentStats) {
        Object.keys(item.percentStats).forEach((key) => {
          if (!totalPercentStats[key]) {
            totalPercentStats[key] = item.percentStats![key];
          } else {
            totalPercentStats[key] += item.percentStats![key];
          }
        });
      }
      if (item.stats) {
        Object.keys(item.stats).forEach((key) => {
          if (!isOtherHand || !isSwingStat(key)) addTo(ns, key, item.stats![key]);
        });
      }
      if (item.triggers && !isOtherHand) {
        item.triggers.forEach((trigger) => {
          ns.triggers.push(trigger);
        });
      }
    }
  });

  /* if more than one set item is equipped, we might have a set bonus */
  Object.keys(setList).forEach((setName) => {
    const setInfo = getSetBonus(setName);
    if (setInfo) {
      if (setList[setName] >= setInfo.pieces) {
        activeSets.push(setName);
        //add percent bonus to totals
        if (setInfo.percentStats) {
          Object.keys(setInfo.percentStats).forEach((key) => {
            if (!totalPercentStats[key]) {
              totalPercentStats[key] = setInfo.percentStats[key];
            } else {
              totalPercentStats[key] += setInfo.percentStats[key];
            }
          });
        }
        if (setInfo.stats) {
          Object.keys(setInfo.stats).forEach((key) => {
            const itemStat = setInfo.stats[key];
            // Unlike items and buffs, a stat the character doesn't have yet is not created here.
            if (itemStat) {
              ns[key] += itemStat;
            }
          });
        }
        if (setInfo.triggers) {
          setInfo.triggers.forEach((trigger: unknown) => {
            ns.triggers.push(trigger);
          });
        }
      }
    }
  });

  buffs.forEach((buff) => {
    if (buff.stats) {
      Object.keys(buff.stats).forEach((key) => {
        addTo(ns, key, buff.stats![key]);
      });
    }
    if (buff.percentStats) {
      Object.keys(buff.percentStats).forEach((key) => {
        addTo(totalPercentStats, key, buff.percentStats![key]);
      });
    }
  });

  /* The base values get calculated here for percentStats */
  Object.keys(totalPercentStats).forEach((key) => {
    const percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
    if (key == "vitality" || key == "dexterity" || key == "strength" || key == "intelligence")
      ns[key] += percentIncrease;
  });

  ns.maxHp = ns.maxHp + ns.vitality * HP_PER_VITALITY;
  ns.maxMp = ns.maxMp + ns.intelligence * 3;
  ns.maxSp = ns.maxSp + Math.floor(ns.vitality * SP_PER_VITALITY);
  ns.magicFind = ns.magicFind || 0;
  ns.maxExp = ns.maxExp || 0;
  ns.exp = current.exp || 0;
  ns.fireResistance = ns.fireResistance || 0;
  ns.lightResistance = ns.lightResistance || 0;
  ns.waterResistance = ns.waterResistance || 0;
  ns.earthResistance = ns.earthResistance || 0;
  ns.attackDelay = ns.attackDelay + ns.dexterity * 0.03 || 0;
  ns.spellPower = Math.floor((ns.spellPower || 0) + ns.intelligence * SPELL_POWER_PER_INTELLIGENCE);
  ns.attackDelay = 1 - Math.floor(ns.dexterity * 0.5) + ns.attackDelay;
  ns.castDelay = ns.castDelay || 1000;
  ns.castDelay = 1 - Math.floor(ns.intelligence * 0.5) + ns.castDelay;
  ns.regenHp = (ns.regenHp || 1) + Math.floor(ns.vitality / 20);
  ns.regenMp = (ns.regenMp || 1) + Math.floor(ns.intelligence / 20);
  ns.regenSp = ns.regenSp || 1;
  ns.armorPierce = ns.armorPierce || 0;
  ns.defense = ns.defense + Math.floor(ns.strength / 2);
  ns.critChance = ns.critChance + ns.dexterity * CRIT_PER_DEXTERITY;
  ns.walkSpeed = ns.walkSpeed + ns.dexterity * 0.03;
  ns.dodgeChance = ns.dodgeChance + ns.dexterity * DODGE_PER_DEXTERITY;
  ns.hpSteal = ns.hpSteal || 0;
  ns.mpSteal = ns.mpSteal || 0;
  ns.spSteal = ns.spSteal || 0;

  // Capped values
  if (ns.walkSpeed < 15) ns.walkSpeed = 15;
  if (ns.walkSpeed > 600) ns.walkSpeed = 600;
  if (ns.critChance > 100) ns.critChance = 100;
  if (ns.dodgeChance > MAX_AVOIDANCE) ns.dodgeChance = MAX_AVOIDANCE;
  for (const element of RESISTANCES) {
    if (ns[element] > MAX_RESISTANCE) ns[element] = MAX_RESISTANCE;
  }
  /* Without a shield, block chance from gear doesn't count (a mob's own still does) */
  if (!HANDS.some((hand) => heldItem(player, hand)?.type === "shield")) {
    ns.blockChance = player.baseStats.blockChance || 0;
  }
  if (ns.blockChance > MAX_AVOIDANCE) ns.blockChance = MAX_AVOIDANCE;
  if (ns.castDelay < 200) ns.castDelay = 200;
  if (ns.attackDelay < 200) ns.attackDelay = 200;

  const isRanged = HANDS.some(
    (hand) => hand !== skipHand && heldItem(player, hand)?.type === "ranged",
  );
  finishDamage(ns, isRanged);

  /* Any percentStat value that needs to be pre-calculated goes here  */
  Object.keys(totalPercentStats).forEach((key) => {
    const percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
    if (key == "maxHp" || key == "maxMp" || key == "defense" || key == "walkSpeed")
      ns[key] += percentIncrease;
  });

  // Moving values
  if (current.hp <= 0) ns.hp = shouldHeal ? ns.maxHp : 0;
  else if (current.hp > ns.maxHp) ns.hp = ns.maxHp;
  else ns.hp = current.hp;
  if (current.mp <= 0) ns.mp = shouldHeal ? ns.maxMp : 0;
  else if (current.mp > ns.maxMp) ns.mp = ns.maxMp;
  else ns.mp = current.mp;
  if (current.sp <= 0) ns.sp = shouldHeal ? ns.maxSp : 0;
  else if (current.sp > ns.maxSp) ns.sp = ns.maxSp;
  else ns.sp = current.sp;

  return { stats: ns, activeSets };
}
