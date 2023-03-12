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
  scene.players?.[socketId]?.destroy();
}

function removeAllPlayers(scene, socketId) {
  for (socketId of Object.keys(scene.players)) {
    removePlayer(scene, socketId);
  }
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
  };
}

function getTrimmedCharacterState(p) {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    roomName: p?.room?.name,
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
    unspentStats: 3,
    speed: 150,
    range: 32,
    accuracy: 0,
    attackSpeed: 0,
    spellDamage: 0,
    castSpeed: 1000,
    armorPierce: 0,
    dexterity: 1,
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
    handRight: ItemBuilder.buildItem("weapon", "common", "common-sword"),
    handLeft: ItemBuilder.buildItem("weapon", "common", "common-sword"),
    //handLeft: ItemBuilder.buildItem("weapon", "unique", "unique-claymore-soul"),
    helmet: ItemBuilder.buildItem("helmet", "unique", "unique-cap-tudwick"),
    accessory: null,
    pants: ItemBuilder.buildItem("pants", "common", "common-pants-cloth"),
    armor: ItemBuilder.buildItem("armor", "common", "common-robe-cloth"),
    boots: null,
    ring1: null,
    ring2: null,
    amulet: null,
  },
  profile: {
    userName: "Player1",
    gender: "female",
    race: "human",
    hair: { tint: "0x00FF00", texture: "hair-3" },
    face: { texture: "face-1" },
    headY: -47,
  },
  roomName: "grassland",
  x: 432,
  y: 400,
};

function randomNumber(low, high) {
  return Math.floor(Math.random() * (high - low + 1) + low);
}

export {
  removePlayer,
  getPlayer,
  getTrimmedRoomState,
  getTrimmedCharacterState,
  getRoomState,
  getCharacterState,
  handlePlayerInput,
  removeAllPlayers,
  getDoor,
  randomNumber,
  baseUser,
};
