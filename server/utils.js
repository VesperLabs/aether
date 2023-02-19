const Door = require("../client/src/Door");
const Player = require("../client/src/Player");
const { mapList } = require("../client/src/Maps");
const { Vault } = require("@geckos.io/snapshot-interpolation");

function initMapRooms(scene) {
  return mapList.reduce((acc, m) => {
    acc[m.name] = {
      name: m.name,
      map: scene.make.tilemap({ key: m.name }),
      players: scene.physics.add.group(),
      doors: scene.physics.add.group(),
      vault: new Vault(),
    };

    /* Create door objects */
    acc[m.name].map.getObjectLayer("Doors").objects?.forEach((door) => {
      scene.doors[door.name] = new Door(scene, door);
      return scene.doors[door.name];
    });

    return acc;
  }, {});
}

function teleportPlayer(scene, socketId, door) {
  scene.players[socketId].room = door.destMap;
  removePlayer(scene, socketId);
  scene.add.existing(scene.players[socketId]);
  scene.mapRooms[door.destMap].players.add(scene.players[socketId]);
  return scene.players[socketId];
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

function getRoomState(scene, room) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room === room)
      .map(getPlayerState),
  };
}

function getPlayerState(p) {
  return {
    id: p.socketId, //required for SI
    socketId: p.socketId,
    room: p.room,
    x: p.x,
    y: p.y,
    vx: p.vx,
    vy: p.vy,
  };
}

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy } = input;
  const player = getPlayer(scene, socketId);
  player.x = x;
  player.y = y;
  player.vx = vx;
  player.vy = vy;
}

const isMobile =
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  getPlayerState,
  handlePlayerInput,
  removeAllPlayers,
  getRoomState,
  isMobile,
  initMapRooms,
  teleportPlayer,
};
