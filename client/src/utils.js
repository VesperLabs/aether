const Player = require("./Player");

function addPlayer(scene, user) {
  const player = new Player(scene, user);
  scene.add.existing(player);
  scene.players.add(player);
  return player;
}

function removePlayer(scene, socketId) {
  if (!scene.players) return;
  scene.players.getChildren().forEach((player) => {
    if (socketId === player.socketId) {
      player.destroy();
    }
  });
}

function resetEntities(scene) {
  scene.players.getChildren().forEach((p) => p.destroy());
  scene.doors.getChildren().forEach((d) => d.destroy());
}

function getPlayer(scene, socketId) {
  if (!scene.players) return;
  return scene.players
    .getChildren()
    .find((player) => socketId === player.socketId);
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

const isMobile =
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  resetEntities,
  constrainVelocity,
  isMobile,
};
