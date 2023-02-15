const Phaser = require("phaser");

class Player extends Phaser.GameObjects.Container {
  constructor(scene, { x, y, socketId, isHero, isServer }) {
    super(scene, x, y, []);
    this.socketId = socketId;
    this.isHero = isHero;
    scene.physics.add.existing(this);
    this.body.setCircle(16 / 2, -(16 / 2), -(16 / 2));
    this.isServer = isServer;
    this.action = "stand";
    this.direction = "down";
    this.vx = 0;
    this.vy = 0;
    /* For the server, don't draw this stuff */
    if (isServer) return;
    this.skin = new Phaser.GameObjects.Sprite(this.scene, 0, -12, "human");
    this.add(this.skin);
    this.skin.play("up-walk");
    scene.add.existing(this.skin); //workaround
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  create() {}
  update() {
    updatePlayerDirection(this);
    this.drawFrame();
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
  drawFrame() {
    const newKey = `${this.direction}-${this.action}`;
    const currentKey = this.skin.anims.currentAnim.key;
    if (currentKey !== newKey) {
      this.skin.play(newKey, true);
    }
  }
}

function updatePlayerDirection(player) {
  if (player.isServer) return;
  const vx = player.body.velocity.x || player.vx;
  const vy = player.body.velocity.y || player.vy;
  if (Math.abs(vy) >= Math.abs(vx)) {
    if (vy > 0) {
      player.direction = "down";
    } else if (vy < 0) {
      player.direction = "up";
    }
  } else {
    if (vx > 0) {
      player.direction = "right";
    } else if (vx < 0) {
      player.direction = "left";
    }
  }
  /* Action */
  if (vx === 0 && vy === 0) {
    player.action = "stand";
  } else {
    player.action = "walk";
  }
}

module.exports = Player;
