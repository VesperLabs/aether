const Player = require("./Player");

function addPlayer(scene, user) {
  const player = new Player(scene, user);
  scene.add.existing(player);
  scene.players.add(player);
  return player;
}

function removePlayer(scene, socketId) {
  if (!scene.players) return;
  const player = getPlayer(scene, socketId);
  player.destroy(true);
}

function resetEntities(scene) {
  scene?.map?.destroy?.(true);
  scene?.players?.destroy?.(true);
  scene?.npcs?.destroy?.(true);
  scene?.doors?.destroy?.(true);
  scene.players = scene.physics.add.group();
  scene.npcs = scene.physics.add.group();
  scene.doors = scene.physics.add.group();
}

function getPlayer(scene, socketId) {
  if (!scene.players) return;
  return scene.players.getChildren().find((player) => socketId === player.socketId);
}

function getNpc(scene, id) {
  if (!scene.npcs) return;
  return scene.npcs.getChildren().find((player) => id === player.id);
}

function addNpc(scene, npcData) {
  const npc = new Player(scene, npcData);
  scene.add.existing(npc);
  scene.npcs.add(npc);
  return npc;
}

// Ensures sprite speed doesnt exceed maxVelocity while update is called (from Phaser example)
function constrainVelocity(sprite, maxVelocity) {
  if (!sprite || !sprite.body) return;

  var angle, currVelocitySqr, vx, vy;
  vx = sprite.body.velocity.x;
  vy = sprite.body.velocity.y;
  currVelocitySqr = vx * vx + vy * vy;

  if (currVelocitySqr > maxVelocity * maxVelocity) {
    angle = Math.atan2(vy, vx);
    vx = Math.cos(angle) * maxVelocity;
    vy = Math.sin(angle) * maxVelocity;
    sprite.body.velocity.x = vx;
    sprite.body.velocity.y = vy;
  }
}

const isMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  getNpc,
  addNpc,
  resetEntities,
  constrainVelocity,
  isMobile,
};
