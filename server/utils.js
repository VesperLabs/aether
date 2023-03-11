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

function calculateStats(user) {
  const baseStats = user?.baseStats;
  return {
    speed: baseStats?.speed,
    attackSpeed: baseStats?.attackSpeed,
  };
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

function getFullRoomState(scene, roomName) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getFullCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((n) => n?.room?.name === roomName)
      .map(getFullCharacterState),
  };
}

function getFullCharacterState(p) {
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
    equipment: p?.equipment,
    profile: p?.profile,
    bubbleMessage: p?.bubbleMessage,
    isAggro: p?.isAggro,
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
  baseStats: { speed: 450, attackSpeed: 200 },
  direction: "up",
  equipment: {
    handRight: ItemBuilder.buildItem("weapon", "common", "common-sword"),
    handLeft: ItemBuilder.buildItem("weapon", "unique", "unique-claymore-soul"),
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
  stats: { hp: null, mp: null, exp: null },
  x: 432,
  y: 400,
};

export {
  removePlayer,
  getPlayer,
  getTrimmedRoomState,
  getTrimmedCharacterState,
  getFullRoomState,
  getFullCharacterState,
  handlePlayerInput,
  removeAllPlayers,
  getDoor,
  calculateStats,
  baseUser,
};
