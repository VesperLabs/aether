//@ts-nocheck
import ItemBuilder from "../shared/ItemBuilder";

const PLAYER_BASE_ATTACK_DELAY = 100;
const SHOP_INFLATION = 4;
const PLAYER_BASE_EXP = 5;
const PLAYER_DEFAULT_SPAWN = { roomName: "grassland-3", x: 1496, y: 2028 };
//const PLAYER_DEFAULT_SPAWN = { roomName: "grassland-2", x: 239, y: 990 };

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy, direction } = input;
  const player = getPlayer(scene, socketId);
  if (!player) return;
  if (player.state.isDead) return;
  if (player?.hasBuff("stun")) {
    player.vx = 0;
    player.vy = 0;
    return;
  }
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

function distanceTo(first, second) {
  let dx = second?.x - first?.x;
  let dy = second?.y - first?.y;
  return Math.sqrt(dx * dx + dy * dy);
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

const calculateNextMaxExp = (level) => {
  return Math.floor(PLAYER_BASE_EXP * Math.pow(1.75, level - 1));
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
    if (isMage) return ItemBuilder.buildItem("weapon", "common", "wand");
    if (isWarrior) return ItemBuilder.buildItem("weapon", "common", "axe");
    if (isRogue) return ItemBuilder.buildItem("weapon", "common", "katar");
  };

  const startStat = 2 * level + 3;

  return {
    startingWeapon: getStartingWeapon(),
    baseStats: {
      level,
      expValue: 0,
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
  distanceTo,
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
};
