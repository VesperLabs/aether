const Phaser = require("phaser");

class Player extends Phaser.GameObjects.Container {
  constructor(scene, { x, y, socketId, isHero }) {
    super(scene, x, y, []);
    this.socketId = socketId;
    this.isHero = isHero;
    scene.physics.add.existing(this);
    this.body.setCircle(16 / 2, -(16 / 2), -(16 / 2));
    this.skin = new Phaser.GameObjects.Sprite(this.scene, 0, -8, "human");
    this.add(this.skin);
  }
  create() {
    // this.anims.create({
    //   key: "walk",
    //   frames: this.anims.generateFrameNames("cybercity", { start: 0, end: 98 }),
    //   repeat: -1,
    // });.play("fly");
    this.add.sprite("human");
  }
}

module.exports = Player;
