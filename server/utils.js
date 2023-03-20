import ItemBuilder from "./ItemBuilder";

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy, direction } = input;
  const player = getPlayer(scene, socketId);
  if (!player) return;
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

function getRoomState(scene, roomName, deepObjects = false) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map((p) => (deepObjects ? p : getCharacterState(p))),
    npcs: Object.values(scene.npcs)
      ?.filter((n) => n?.room?.name === roomName)
      .map((p) => (deepObjects ? p : getCharacterState(p))),
    spells: Object.values(scene.spells)
      ?.filter((s) => s?.room?.name === roomName)
      .map((s) => s?.getTrimmed()),
    loots: Object.values(scene.loots)?.filter((l) => l?.roomName === roomName),
  };
}

function getCharacterState(p) {
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
    bubbleMessage: p?.bubbleMessage,
    kind: p?.kind,
  };
}

function getTrimmedRoomState(scene, roomName) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTrimmedCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTrimmedCharacterState),
    spells: Object.values(scene.spells)
      ?.filter((s) => s?.room?.name === roomName)
      .map((s) => s?.getTrimmed()),
    loots: Object.values(scene.loots)?.filter((l) => l?.roomName === roomName),
  };
}

function getTrimmedCharacterState(p) {
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
    bubbleMessage: p?.bubbleMessage,
  };
}

const baseUser = {
  email: "arf@arf.arf",
  baseStats: {
    expValue: 0,
    level: 1,
    speed: 150,
    accuracy: 0,
    attackDelay: 100,
    spellDamage: 0,
    castSpeed: 1000,
    armorPierce: 0,
    dexterity: 20,
    strength: 1,
    vitality: 1,
    intelligence: 1,
    defense: 0,
    blockChance: 0,
    critChance: 0,
    critMultiplier: 2,
    dodgeChance: 0,
    maxDamage: 0,
    minDamage: 0,
    magicFind: 0,
    regenHp: 1,
    regenMp: 1,
    maxExp: 20,
    maxHp: 10,
    maxMp: 10,
  },
  direction: "down",
  equipment: {
    handRight: ItemBuilder.buildItem("weapon", "rare", "katar"),
    handLeft: ItemBuilder.buildItem("weapon", "rare", "katar"),
    helmet: ItemBuilder.buildItem("helmet", "unique", "theBunnyWhisker"),
    accessory: ItemBuilder.buildItem("accessory", "unique", "compoundLenses"),
    pants: null,
    armor: ItemBuilder.buildItem("armor", "common", "clothRobe"),
    boots: ItemBuilder.buildItem("boots", "rare", "nutshellBoots"),
    ring1: ItemBuilder.buildItem("ring", "unique", "bloodMusic"),
    ring2: ItemBuilder.buildItem("ring", "set", "timmysSignet"),
    amulet: ItemBuilder.buildItem("amulet", "set", "timmysChain"),
  },
  inventory: [ItemBuilder.buildItem("weapon", "rare", "katar")],
  profile: {
    userName: "Player1",
    gender: "female",
    race: "human",
    hair: { tint: "0x88FFFF", texture: "hair-3" },
    face: { texture: "face-1" },
    headY: -47,
  },
  roomName: "grassland",
  x: 432,
  y: 400,
};

function randomNumber(min, max) {
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

export {
  removePlayer,
  getPlayer,
  getTrimmedRoomState,
  getTrimmedCharacterState,
  getRoomState,
  getCharacterState,
  handlePlayerInput,
  getDoor,
  randomNumber,
  getCharacterDirection,
  distanceTo,
  baseUser,
};
