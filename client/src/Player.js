const Phaser = require("phaser");

class Player extends Phaser.GameObjects.Container {
  constructor(scene, { x, y, input = {}, socketId, isHero, targetX, targetY }) {
    super(scene, x, y, []);
    this.socketId = socketId;
    this.isHero = isHero;
    this.targetX = targetX;
    this.targetY = targetY;
    scene.physics.add.existing(this);
    this.body.setCircle(16 / 2, -(16 / 2), -(16 / 2));
  }
}

module.exports = Player;
