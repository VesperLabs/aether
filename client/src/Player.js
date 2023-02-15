const Phaser = require("phaser");

class Player extends Phaser.GameObjects.Container {
  constructor(scene, { x, y, socketId, isHero }) {
    super(scene, x, y, []);
    this.socketId = socketId;
    this.isHero = isHero;
    scene.physics.add.existing(this);
    this.body.setCircle(16 / 2, -(16 / 2), -(16 / 2));
    this.skin = new Phaser.GameObjects.Sprite(this.scene, 0, -12, "human");
    this.add(this.skin);
    scene.anims.create({
      key: "up-walk",
      frames: scene.anims.generateFrameNames("human", {
        prefix: "up-walk.",
        zeroPad: 3,
        start: 0,
        end: 2,
      }),
      frameRate: 3,
      repeat: -1,
      yoyo: true,
    });
    this.skin.play("up-walk");
    scene.add.existing(this.skin); //workaround
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  create() {}
  update() {}
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}

module.exports = Player;
