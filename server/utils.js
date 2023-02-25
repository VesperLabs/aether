const Door = require("../client/src/Door");
const Player = require("../client/src/Player");
const { mapList } = require("../client/src/Maps");
const { Vault } = require("@geckos.io/snapshot-interpolation");

function initMapRooms(scene) {
  return mapList.reduce((acc, room) => {
    acc[room.name] = {
      name: room.name,
      map: scene.make.tilemap({ key: room.name }),
      players: scene.physics.add.group(),
      doors: scene.physics.add.group(),
      vault: new Vault(),
    };

    /* Create door objects */
    scene.doors[room.name] = {};
    acc[room.name].map.getObjectLayer("Doors").objects?.forEach((door) => {
      scene.doors[room.name][door.name] = new Door(scene, door);
      return scene.doors[room.name][door.name];
    });

    return acc;
  }, {});
}

function changeMap(scene, socketId, prevDoor, nextDoor) {
  const player = scene.players[socketId];
  const room = prevDoor.destMap;
  player.room = room;
  player.x = nextDoor.centerPos.x;
  player.y = nextDoor.centerPos.y;
  removePlayer(scene, socketId);
  scene.add.existing(player);
  scene.mapRooms[room].players.add(player);
  return player;
}

function addPlayer(scene, user) {
  const socketId = user?.socketId;
  scene.players[socketId] = new Player(scene, { ...user, isServer: true });
  scene.add.existing(scene.players[socketId]);
  scene.mapRooms[user.room].players.add(scene.players[socketId]);
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
      .map(getFullPlayerState),
  };
}

function getFullPlayerState(p) {
  return {
    id: p?.socketId, //required for SI
    socketId: p?.socketId,
    room: p?.room,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    equips: p?.equips,
  };
}

function getTrimmedRoomState(scene, room) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room === room)
      .map(getTrimmedPlayerState),
  };
}

function getTrimmedPlayerState(p) {
  return {
    id: p?.socketId, //required for SI
    socketId: p?.socketId,
    room: p?.room,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
  };
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

const isMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  getTrimmedRoomState,
  getTrimmedPlayerState,
  getFullRoomState,
  getFullPlayerState,
  handlePlayerInput,
  removeAllPlayers,
  initMapRooms,
  changeMap,
  getDoor,
  isMobile,
};
