function addPlayer({ scene, socketId, layer }) {
  const player = scene.physics.add
    .sprite(0, 0, "character")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(40, 40);
  player.username = "Trebs";
  player.rotation = 0;
  player.socketId = socketId;
  player.input = {
    left: false,
    right: false,
    up: false,
    down: false,
  };
  player.velocity_x = 0;
  player.velocity_y = 0;
  scene.players.add(player);
  /* TODO: See if i can move these up */
  player.setCollideWorldBounds(true);
  player.onWorldBounds = true;
  scene.physics.add.collider(player, layer);
}

function removePlayer({ scene, socketId }) {
  scene.players.getChildren().forEach((player) => {
    if (socketId === player.socketId) {
      player.destroy();
    }
  });
}
