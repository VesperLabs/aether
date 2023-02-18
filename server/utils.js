const Player = require("../client/src/Player");

function addPlayer(scene, user) {
  const socketId = user?.socketId;
  scene.players[socketId] = new Player(scene, { ...user, isServer: true });
  scene.add.existing(scene.players[socketId]);
  scene.mapRooms[user.room].players.add(scene.players[socketId]);
  return scene.players[socketId];
}

function removePlayer(scene, socketId) {
  scene.players?.[socketId]?.destroy();
  delete scene.players?.[socketId];
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
};
