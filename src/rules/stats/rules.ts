import { ItemBuilder } from "@/content";

/** An open-ended bag of stat name -> value. Also carries `triggers` once calculated. */
export type StatBag = Record<string, any>;

/** The part of an item (equipment piece or ability) that affects stats. */
export interface StatsItem {
  key?: string;
  setName?: string;
  stats?: Record<string, number>;
  percentStats?: Record<string, number>;
  triggers?: unknown[];
}

export interface StatsBuff {
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
  stats: StatBag;
  activeSets: string[];
}

export interface ExpValueInput {
  /** The killer's level. */
  playerLevel: number | string | undefined;
  mobLevel: number | string | undefined;
}

export const PLAYER_BASE_EXP = 50; // base experience needed for level 1
const PLAYER_BASE_ATTACK_DELAY = 100;

type CharClass = "mage" | "warrior" | "rogue" | "cleric";

/**
 * Exp gain from a mob depends on the player's level and the difference between player and
 * mob level, with a cap at 5 levels of difference.
 */
export function calculateExpValue({ playerLevel, mobLevel }: ExpValueInput): number {
  const player = parseInt(playerLevel as string) || 0;
  const mob = parseInt(mobLevel as string) || 0;

  const playerGreaterBy = Math.max(0, player - mob);

  // Exp from a mob is capped at the mob's level for players that are lower level than the mob.
  const levelMultiplier = mob > player ? mob : player;

  if (playerGreaterBy > 5) return 0; // Mob too wimpy. no exp.

  return Math.max(3, Math.floor(levelMultiplier * 0.5));
}

/** How much exp is needed for the next level each time a player levels up. */
export function calculateNextMaxExp(level: number): number {
  const baseExp = PLAYER_BASE_EXP;
  let totalExp = baseExp;

  for (let i = 2; i <= level; i++) {
    totalExp += baseExp + baseExp * 0.1 * (i - 1);
  }

  return Math.floor(totalExp);
}

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
  const isMage = charClass === ("mage" satisfies CharClass);
  const isWarrior = charClass === ("warrior" satisfies CharClass);
  const isRogue = charClass === ("rogue" satisfies CharClass);
  const isCleric = charClass === ("cleric" satisfies CharClass);

  const startStat = 2 * level + 3;

  return {
    level,
    walkSpeed: 100,
    accuracy: 0,
    attackDelay: PLAYER_BASE_ATTACK_DELAY,
    spellPower: 0,
    castDelay: 1000,
    armorPierce: 0,
    dexterity: isRogue ? startStat : level,
    strength: isWarrior ? startStat : level,
    vitality: isCleric ? startStat : level,
    intelligence: isMage ? startStat : level,
    defense: 0,
    blockChance: 0,
    critChance: 0,
    critMultiplier: 1.5,
    dodgeChance: 0,
    maxDamage: 0,
    minDamage: 0,
    magicFind: 1,
    regenHp: 1,
    regenMp: 1,
    regenSp: 1,
    maxHp: 10,
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

/**
 * Work out a character's full stats from its base stats, gear, abilities, set bonuses and buffs.
 * Does not change its input: the caller stores `stats` and `activeSets`.
 */
export function calculateStats(player: StatsInput, shouldHeal = false): StatsResult {
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
          addTo(ns, key, item.stats![key]);
        });
      }
      if (item.triggers) {
        item.triggers.forEach((trigger) => {
          ns.triggers.push(trigger);
        });
      }
    }
  });

  /* if more than one set item is equipped, we might have a set bonus */
  Object.keys(setList).forEach((setName) => {
    const setInfo = ItemBuilder.getSetInfo(setName);
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

  ns.maxHp = ns.maxHp + ns.vitality * 3;
  ns.maxMp = ns.maxMp + ns.intelligence * 3;
  ns.maxSp = ns.maxSp + Math.floor(ns.vitality * 0.03);
  ns.magicFind = ns.magicFind || 0;
  ns.maxExp = ns.maxExp || 0;
  ns.exp = current.exp || 0;
  ns.fireResistance = ns.fireResistance || 0;
  ns.lightResistance = ns.lightResistance || 0;
  ns.waterResistance = ns.waterResistance || 0;
  ns.earthResistance = ns.earthResistance || 0;
  ns.attackDelay = ns.attackDelay + ns.dexterity * 0.03 || 0;
  ns.spellPower = Math.floor((ns.spellPower || 0) + ns.intelligence * 0.25);
  ns.attackDelay = 1 - Math.floor(ns.dexterity * 0.5) + ns.attackDelay;
  ns.castDelay = ns.castDelay || 1000;
  ns.castDelay = 1 - Math.floor(ns.intelligence * 0.5) + ns.castDelay;
  ns.regenHp = (ns.regenHp || 1) + Math.floor(ns.vitality / 20);
  ns.regenMp = (ns.regenMp || 1) + Math.floor(ns.intelligence / 20);
  ns.regenSp = ns.regenSp || 1;
  ns.armorPierce = ns.armorPierce + ns.dexterity * 0.75 + ns.strength * 0.5;
  ns.defense = ns.defense + ns.strength;
  ns.critChance = ns.critChance + ns.dexterity * 0.05;
  ns.walkSpeed = ns.walkSpeed + ns.dexterity * 0.03;
  ns.dodgeChance = ns.dodgeChance + ns.dexterity * 0.05;
  ns.hpSteal = ns.hpSteal || 0;
  ns.mpSteal = ns.mpSteal || 0;

  // Capped values
  if (ns.walkSpeed < 15) ns.walkSpeed = 15;
  if (ns.walkSpeed > 600) ns.walkSpeed = 600;
  if (ns.critChance > 100) ns.critChance = 100;
  if (ns.dodgeChance > 75) ns.dodgeChance = 75;
  if (ns.blockChance > 75) ns.blockChance = 75;
  if (ns.castDelay < 200) ns.castDelay = 200;
  if (ns.attackDelay < 200) ns.attackDelay = 200;

  const damageCalc = ((ns.strength * 2 + ns.dexterity / 2) * ns.level) / 100;
  const damageModifier = Math.floor(1 + damageCalc);
  ns.minDamage = ns.minDamage + Math.floor(damageCalc);
  ns.maxDamage = Math.max(ns.maxDamage + damageModifier, ns.minDamage);

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
