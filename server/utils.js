import Door from "../src/Door";
const Player = require("./Player");
const crypto = require("crypto");

function createDoors(scene) {
  for (const room of Object.values(scene.roomManager.rooms)) {
    room.tileMap.getObjectLayer("Doors").objects?.forEach((door) => {
      if (!scene.doors[room.name]) {
        scene.doors[room.name] = {};
      }
      scene.doors[room.name][door.name] = new Door(scene, door);
      return scene.doors[room.name][door.name];
    });
  }
}

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy } = input;
  const player = getPlayer(scene, socketId);
  if (!player) return;
  player.x = x;
  player.y = y;
  player.vx = vx;
  player.vy = vy;
}

function calculateStats(user) {
  const baseStats = user?.baseStats;
  return {
    speed: baseStats?.speed,
    attackSpeed: baseStats?.attackSpeed,
  };
}

function addPlayer(scene, user) {
  const id = crypto.randomUUID();
  const socketId = user?.socketId;
  scene.players[socketId] = new Player(scene, {
    id,
    ...user,
    isServer: true,
    stats: calculateStats(user),
  });
  scene.add.existing(scene.players[socketId]);
  scene.roomManager.rooms[user.room].players.add(scene.players[socketId]);
  return scene.players[socketId];
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

function getDoor(scene, room, doorName) {
  return scene?.doors?.[room]?.[doorName];
}

function getFullRoomState(scene, room) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room === room)
      .map(getFullCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((n) => n?.room === room)
      .map(getFullCharacterState),
  };
}

function getFullCharacterState(p) {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    room: p?.room,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    stats: p?.stats,
    equips: p?.equips,
    profile: p?.profile,
    bubbleMessage: p?.bubbleMessage,
    isAggro: p?.isAggro,
  };
}

function getTrimmedRoomState(scene, room) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room === room)
      .map(getTrimmedCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((p) => p?.room === room)
      .map(getTrimmedCharacterState),
  };
}

function getTrimmedCharacterState(p) {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    room: p?.room,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    bubbleMessage: p?.bubbleMessage,
  };
}

function setNpcCollision(scene) {
  for (const room of Object.values(scene.roomManager.rooms)) {
    room.colliders.forEach((c) => {
      scene.physics.add.collider(room.npcs, c);
    });
  }
}

const isMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export {
  addPlayer,
  removePlayer,
  getPlayer,
  getTrimmedRoomState,
  getTrimmedCharacterState,
  getFullRoomState,
  getFullCharacterState,
  handlePlayerInput,
  removeAllPlayers,
  createDoors,
  getDoor,
  setNpcCollision,
  calculateStats,
  isMobile,
};
