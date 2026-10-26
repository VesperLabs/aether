//@ts-nocheck
import { ItemBuilder } from "@/shared/content";
import { PLAYER_BASE_EXP, getBaseStats } from "@/shared/rules/stats";
import { decodeWireDirection, encodeWireDirection, pickTickStateLite } from "@/shared/network/sync";

const QUEST_GOLD_MULTIPLIER = Math.floor(PLAYER_BASE_EXP * 0.1);
const QUEST_EXP_MULTIPLIER = Math.floor(PLAYER_BASE_EXP / 2);

const PLAYER_DEFAULT_SPAWN = { roomName: "grassland-3", x: 1496, y: 2028 };
//const PLAYER_DEFAULT_SPAWN = { roomName: "grassland-2", x: 239, y: 990 };

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy, d, direction, roomName } = input;
  const player = getPlayer(scene, socketId);
  if (!player) return;
  if (player.state.isDead) return;
  if (player?.hasBuff("stun")) {
    player.vx = 0;
    player.vy = 0;
    return;
  }
  const effectiveRoom = roomName ?? player.roomName;
  if (player.roomName !== effectiveRoom) return; // player is changing room
  player.x = x;
  player.y = y;
  player.vx = vx;
  player.vy = vy;
  player.direction =
    typeof d === "number"
      ? decodeWireDirection(d, player.direction)
      : (direction ?? player.direction);
}

function removePlayer(scene, socketId) {
  const player = scene.players[socketId];
  /* Must clear room physics group + room refs (same path as respawn / door); otherwise
   * disconnected players stay in room.playerManager and NPCs / room logic still see them. */
  if (player?.room?.playerManager) {
    player.room.playerManager.remove(socketId);
  }
  player?.destroy(true);
  delete scene.players?.[socketId];
}

function getPlayer(scene, socketId) {
  return scene.players[socketId];
}

function getDoor(scene, roomName, doorName) {
  return scene?.doors?.[roomName]?.[doorName];
}

function getRoomState(scene: ServerScene, roomName: string): RoomState {
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

/**
 * Tick sync for ground loot: no `item` blob — clients already have full item from lootSpawned / heroInit.
 * Cuts most of the JSON on busy maps (item trees were repeated every 20Hz).
 */
/** Tick loot: client only needs id + expiredSince (destroy when both match). Full props from spawn / heroInit. */
function getLootTickWire(l: Loot) {
  const o: { id: string; expiredSince?: number } = { id: l.id };
  if (l.expiredSince != null) o.expiredSince = l.expiredSince;
  return o;
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
    loots: Object.values(scene.loots)
      ?.filter((l) => l?.roomName === roomName)
      .map(getLootTickWire),
  };
}

/**
 * Only fields used by client `Player.updateState` — not the full state blob (huge JSON every tick).
 */
function getTickStateLite(p: Character) {
  return pickTickStateLite(p?.state);
}

function getTickCharacterState(p: Character): TickCharacterState {
  const uid = p?.socketId || p?.id;
  const vx = p?.vx ?? 0;
  const vy = p?.vy ?? 0;
  return {
    id: uid, //required for SI (same as socketId for players; omit duplicate key on wire)
    /* room omitted: snapshot is already scoped to one room; saves bytes per entity per tick */
    d: encodeWireDirection(p?.direction),
    state: getTickStateLite(p),
    /* Floats: rounding broke small velocities (→0) and stepped positions for snapshot interpolation */
    x: p?.x ?? 0,
    y: p?.y ?? 0,
    vx,
    vy,
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

function useGetBaseCharacterDefaults({ level = 1, charClass }) {
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

  const getStartingSpell = () => {
    if (isCleric) return ItemBuilder.buildItem("spell", "common", "lightball");
    if (isMage) return ItemBuilder.buildItem("spell", "common", "fireball");
    if (isWarrior) return ItemBuilder.buildItem("spell", "common", "flameSlash");
    if (isRogue) return ItemBuilder.buildItem("spell", "common", "stealth");
  };

  return {
    startingWeapon: getStartingWeapon(),
    startingSpell: getStartingSpell(),
    baseStats: getBaseStats({ level, charClass }),
    ...PLAYER_DEFAULT_SPAWN,
  };
}

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

  const isEmptyObject = (obj: object) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  };

  const isEmptyArray = (arr: Array) => {
    return Array.isArray(arr) && arr.length === 0;
  };

  for (const [key, value] of Object.entries(item)) {
    if (value === null || typeof value === "undefined") continue;
    if (!isEmptyObject(value) && !isEmptyArray(value)) {
      filteredItem[key] = value;
    }
  }

  return filteredItem;
}

function sleep(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
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
  cloneObject,
  getBuffRoomState,
  getBuffCharacterState,
  PLAYER_DEFAULT_SPAWN,
  QUEST_GOLD_MULTIPLIER,
  QUEST_EXP_MULTIPLIER,
  useGetBaseCharacterDefaults,
  filterNullEmpty,
  sleep,
};
