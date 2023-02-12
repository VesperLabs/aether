function addPlayer(scene, { socketId, x, y }) {
  const player = scene.physics.add
    .sprite(x, y, "character")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(40, 40);
  player.socketId = socketId;
  scene.physics.add.collider(player, scene.players);
  scene.players.add(player);
}

function removePlayer(scene, { socketId }) {
  if (!scene.players) return;
  scene.players.getChildren().forEach((player) => {
    if (socketId === player.playerId) {
      player.destroy();
    }
  });
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

//handling players inputs from socket
function handlePlayerInput(scene, { socketId, input }) {
  if (!scene.players) return;
  scene.players.getChildren().forEach((player) => {
    if (socketId === player.socketId) {
      player.input = input;
    }
  });
}

module.exports = {
  addPlayer,
  removePlayer,
  handlePlayerInput,
  constrainVelocity,
};
