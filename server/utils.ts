//@ts-nocheck
import ItemBuilder from "../shared/ItemBuilder";

const PLAYER_BASE_ATTACK_DELAY = 100;
const SHOP_INFLATION = 4;
const PLAYER_BASE_EXP = 100; // Define the base experience for level 1
const PLAYER_DEFAULT_SPAWN = { roomName: "grassland-3", x: 1496, y: 2028 };
//const PLAYER_DEFAULT_SPAWN = { roomName: "grassland-2", x: 239, y: 990 };

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy, direction, roomName } = input;
  const player = getPlayer(scene, socketId);
  if (!player) return;
  if (player.state.isDead) return;
  if (player?.hasBuff("stun")) {
    player.vx = 0;
    player.vy = 0;
    return;
  }
  if (player.roomName !== roomName) return; //player is changing room
  player.x = x;
  player.y = y;
  player.vx = vx;
  player.vy = vy;
  player.direction = direction;
}

function removePlayer(scene, socketId) {
  const player = scene.players[socketId];
  player?.destroy(true);
  delete scene.players?.[socketId];
}

function getPlayer(scene, socketId) {
  return scene.players[socketId];
}

function getDoor(scene, roomName, doorName) {
  return scene?.doors?.[roomName]?.[doorName];
}

function getRoomState(scene: ServerScene, roomName: String): RoomState {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map((p) => getFullCharacterState(p)),
    npcs: Object.values(scene.npcs)
      ?.filter((n) => n?.room?.name === roomName)
      .map((p) => getFullCharacterState(p)),
    // spells: Object.values(scene.spells)
    //   ?.filter((s) => s?.room?.name === roomName)
    //   .map((s) => s?.getTrimmed()),
    loots: Object.values(scene.loots)?.filter((l) => l?.roomName === roomName),
  };
}

function getFullCharacterState(p: Character): FullCharacterState {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    peerId: p?.peerId,
    roomName: p?.room?.name,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    direction: p?.direction,
    stats: p?.stats,
    state: p?.state,
    equipment: p?.equipment,
    inventory: p?.inventory,
    profile: p?.profile,
    kind: p?.kind,
    charClass: p?.charClass,
    npcKills: p?.npcKills,
    buffs: p?.buffs,
    quests: p?.getQuests(),
    abilities: p?.abilities,
    activeItemSlots: p?.activeItemSlots,
    gold: p?.gold,
    hitBoxSize: p?.hitBoxSize,
  };
}

function getTickRoomState(scene: ServerScene, roomName: string): TickRoomState {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTickCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTickCharacterState),
    // spells: Object.values(scene.spells)
    //   ?.filter((s) => s?.room?.name === roomName)
    //   .map((s) => s?.getTrimmed()),
    loots: Object.values(scene.loots)?.filter((l) => l?.roomName === roomName),
  };
}

function getTickCharacterState(p: Character): TickCharacterState {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    roomName: p?.room?.name,
    direction: p?.direction,
    state: p?.state,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
  };
}

// gets server and player npcs that have expired buffs (each tick)
function getBuffRoomState(scene: ServerScene, roomName: string): BuffRoomState {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName && p?.state?.hasBuffChanges)
      .map(getBuffCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((p) => p?.room?.name === roomName && p?.state?.hasBuffChanges)
      .map(getBuffCharacterState),
  };
}

function getBuffCharacterState(p: Character): BuffCharacterState {
  const uid = p?.socketId || p?.id;
  if (p?.state) {
    // no longer need to send this to client
    p.state.hasBuffChanges = false;
  }
  return {
    id: uid,
    socketId: uid,
    state: p?.state,
    stats: p?.stats,
    buffs: p?.buffs,
    activeItemSlots: p?.activeItemSlots,
  };
}

function randomNumber(min, max) {
  if (max <= min) {
    return min;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCharacterDirection(character, point) {
  const dx = point.x - character.x;
  const dy = point.y - character.y;

  // determine which direction has the greatest distance
  if (Math.abs(dx) >= Math.abs(dy)) {
    // horizontal distance is greater than or equal to vertical distance
    if (dx > 0) {
      return "right";
    } else {
      return "left";
    }
  } else {
    // vertical distance is greater than horizontal distance
    if (dy > 0) {
      return "down";
    } else {
      return "up";
    }
  }
}

function cloneObject(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : null;
}

function checkSlotsMatch(s1, s2) {
  const handNames = ["handLeft", "handRight"];
  const ringNames = ["ring1", "ring2"];
  if (s1 === s2) return true;
  if (s1 === "hands" && handNames?.includes(s2)) return true;
  if (s2 === "hands" && handNames?.includes(s1)) return true;
  if (s1 === "ring" && ringNames?.includes(s2)) return true;
  if (s2 === "ring" && ringNames?.includes(s1)) return true;
  return false;
}

// exp gain from mobs is based on the players
// level and difference between player and mob level with a
// cap at 5 level difference.
const calculateExpValue = (player, mob) => {
  const playerLevel = parseInt(player?.stats?.level) || 0;
  const mobLevel = parseInt(mob?.stats?.level) || 0;
  const levelDiff = Math.max(0, playerLevel - mobLevel);

  if (levelDiff > 5) return 0; // Mob too wimpy

  let expMultiplier = 0.25;
  if (levelDiff > 4) expMultiplier = 0; // Mob weak. no multiplier on level.
  else if (levelDiff > 3) expMultiplier = 0.1;
  else if (levelDiff > 2) expMultiplier = 0.15;
  else if (levelDiff > 1) expMultiplier = 0.2;

  return 1 + Math.floor(playerLevel * expMultiplier);
};

const calculateNextMaxExp = (level) => {
  const baseExp = PLAYER_BASE_EXP; // Base experience for the first level
  const expIncreasePerLevel = PLAYER_BASE_EXP; // Fixed amount of additional EXP required per level
  const additionalIncreasePerLevel = PLAYER_BASE_EXP * 0.5; // Small linear increase in the EXP increase per level

  let totalExp = baseExp;
  let currentIncrease = expIncreasePerLevel;

  for (let i = 2; i <= level; i++) {
    currentIncrease += additionalIncreasePerLevel; // Linearly increase the exp required for each subsequent level
    totalExp += currentIncrease;
  }

  return Math.floor(totalExp);
};

function mergeAndAddValues(obj1, obj2) {
  const result = {};

  for (const key in obj1) {
    if (obj1.hasOwnProperty(key) && obj2.hasOwnProperty(key)) {
      result[key] = obj1[key] + obj2[key];
    } else {
      result[key] = obj1[key];
    }
  }

  for (const key in obj2) {
    if (!obj1.hasOwnProperty(key)) {
      result[key] = obj2[key];
    }
  }

  return result;
}

function addValuesToExistingKeys(
  obj1: Record<string, number>,
  obj2: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};

  // Copy obj1 into the result object
  Object.keys(obj1).forEach((key) => {
    result[key] = obj1[key];
  });

  // Add the values from obj2 to the result object
  Object.keys(result).forEach((key) => {
    if (obj2.hasOwnProperty(key)) {
      result[key] += obj2[key];
    }
  });

  return result;
}

const useGetBaseCharacterDefaults = ({ level = 1, charClass }) => {
  const isMage = charClass === "mage";
  const isWarrior = charClass === "warrior";
  const isRogue = charClass === "rogue";
  const isCleric = charClass === "cleric";

  const getStartingWeapon = () => {
    if (isCleric) return ItemBuilder.buildItem("weapon", "common", "staff");
    if (isMage) return ItemBuilder.buildItem("weapon", "common", "wand");
    if (isWarrior) return ItemBuilder.buildItem("weapon", "common", "hatchet");
    if (isRogue) return ItemBuilder.buildItem("weapon", "common", "katar");
  };

  const startStat = 2 * level + 3;

  return {
    startingWeapon: getStartingWeapon(),
    baseStats: {
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
    },
    ...PLAYER_DEFAULT_SPAWN,
  };
};

function filterNullEmpty(data) {
  if (Array.isArray(data)) {
    return data.map((item) => filterProperties(item));
  } else if (typeof data === "object" && data !== null) {
    const filteredItem = {};
    for (const [key, value] of Object.entries(data)) {
      filteredItem[key] = filterProperties(value);
    }
    return filteredItem;
  } else {
    throw new Error("Invalid input data. Must be an array or an object.");
  }
}

function filterProperties(item) {
  if (!item) return null;
  const filteredItem = {};

  for (const [key, value] of Object.entries(item)) {
    if (value === null || typeof value === "undefined") continue;
    if (!isEmptyObject(value) && !isEmptyArray(value)) {
      filteredItem[key] = value;
    }
  }

  return filteredItem;
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

function isEmptyArray(arr) {
  return Array.isArray(arr) && arr.length === 0;
}

const calculateStats = (player, shouldHeal = false) => {
  const { equipment = {}, abilities = {}, buffs = [] } = player;
  // disregard items that are not actively equipped
  const allSlots = Object.keys({ ...abilities, ...equipment }).filter((slot) =>
    player.activeItemSlots?.includes(slot)
  );
  let totalPercentStats = {};
  let ns = cloneObject(player.baseStats);
  let setList = {};
  let activeSets = [];
  player.state = player.state ?? {};
  player.stats = Object.keys(player?.stats)?.length
    ? player.stats
    : { hp: 0, mp: 0, sp: 0, exp: 0 };

  if (!ns?.triggers) {
    ns.triggers = [];
  }

  /* Get stats from equipped abilities and items */
  allSlots.forEach((eKey) => {
    let item = abilities[eKey] || equipment[eKey];
    if (item) {
      if (item.setName) {
        if (setList[item.setName]) {
          let amountThisItem = 0;
          allSlots.forEach((aKey) => {
            let aItem = abilities[aKey] || equipment[aKey];
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
            totalPercentStats[key] = item.percentStats[key];
          } else {
            totalPercentStats[key] += item.percentStats[key];
          }
        });
      }
      if (item.stats) {
        Object.keys(item.stats).forEach((key) => {
          const itemStat = item.stats[key];
          if (!ns[key]) {
            ns[key] = 0;
          }
          if (itemStat) {
            ns[key] += itemStat;
          }
        });
      }
      if (item?.triggers) {
        item?.triggers?.forEach((trigger) => {
          ns.triggers.push(trigger);
        });
      }
    }
  });

  /* if more than one set item is equipped, we might have a set bonus */
  Object.keys(setList).forEach((key) => {
    if (ItemBuilder.getSetInfo(key)) {
      const setInfo = ItemBuilder.getSetInfo(key);
      if (setList[key] >= setInfo.pieces) {
        activeSets.push(key);
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
            let itemStat = setInfo.stats[key];
            if (itemStat) {
              ns[key] += itemStat;
            }
          });
        }
        if (setInfo.triggers) {
          setInfo?.triggers?.forEach((trigger: Trigger) => {
            ns.triggers.push(trigger);
          });
        }
      }
    }
  });

  buffs.forEach((buff: Buff) => {
    if (buff.stats) {
      Object.keys(buff.stats).forEach((key) => {
        const buffStat = buff.stats[key];
        if (!ns[key]) {
          ns[key] = 0;
        }
        if (buffStat) {
          ns[key] += buffStat;
        }
      });
    }
  });

  /* The base values get calculated here for percentStats */
  Object.keys(totalPercentStats).forEach((key) => {
    let percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
    if (
      // do we need these?
      key == "vitality" ||
      key == "dexterity" ||
      key == "strength" ||
      key == "intelligence"
    )
      ns[key] += percentIncrease;
  });

  ns.maxHp = ns.maxHp + ns.vitality * 5;
  ns.maxMp = ns.maxMp + ns.intelligence * 3;
  ns.maxSp = ns.maxSp + Math.floor(ns.vitality * 0.03);
  ns.magicFind = ns.magicFind || 0;
  ns.maxExp = ns.maxExp || 0;
  ns.exp = player.stats.exp || 0;
  ns.fireResistance = ns.fireResistance || 0;
  ns.lightResistance = ns.lightResistance || 0;
  ns.waterResistance = ns.waterResistance || 0;
  ns.earthResistance = ns.earthResistance || 0;
  ns.attackDelay = ns.attackDelay + ns.dexterity * 0.03 || 0;
  ns.spellPower = Math.floor((ns.spellPower || 0) + ns.intelligence * 0.25);
  ns.attackDelay = 1 - Math.floor(ns.dexterity * 0.5) + ns.attackDelay;
  ns.castDelay = ns.castDelay || 1000;
  ns.castDelay = 1 - Math.floor(ns.intelligence * 0.5) + ns.castDelay;
  ns.accuracy = ns.accuracy;
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
  //ns.blockChance = ns.blockChance + (0 * (ns.dexterity - 15)) / (ns.level * 2);

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
    let percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
    if (key == "maxHp" || key == "maxMp" || key == "defense") ns[key] += percentIncrease;
  });

  // Moving values
  if (player.stats.hp <= 0) ns.hp = shouldHeal ? ns.maxHp : 0;
  else if (player.stats.hp > ns.maxHp) ns.hp = ns.maxHp;
  else ns.hp = player.stats.hp;
  if (player.stats.mp <= 0) ns.mp = shouldHeal ? ns.maxMp : 0;
  else if (player.stats.mp > ns.maxMp) ns.mp = ns.maxMp;
  else ns.mp = player.stats.mp;
  if (player.stats.sp <= 0) ns.sp = shouldHeal ? ns.maxSp : 0;
  else if (player.stats.sp > ns.maxSp) ns.sp = ns.maxSp;
  else ns.sp = player.stats.sp;
  player.stats = ns;

  player.state.activeSets = activeSets;
};

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export {
  removePlayer,
  getPlayer,
  getTickRoomState,
  getTickCharacterState,
  getRoomState,
  getFullCharacterState,
  handlePlayerInput,
  getDoor,
  randomNumber,
  getCharacterDirection,
  cloneObject,
  checkSlotsMatch,
  getBuffRoomState,
  getBuffCharacterState,
  SHOP_INFLATION,
  PLAYER_BASE_EXP,
  PLAYER_DEFAULT_SPAWN,
  calculateNextMaxExp,
  useGetBaseCharacterDefaults,
  mergeAndAddValues,
  filterNullEmpty,
  addValuesToExistingKeys,
  calculateStats,
  calculateExpValue,
  sleep,
};
