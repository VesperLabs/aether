const Phaser = require("phaser");

class Player extends Phaser.GameObjects.Container {
  constructor(
    scene,
    { x, y, socketId, isHero = false, isServer = false, speed = 200 }
  ) {
    super(scene, x, y, []);
    this.socketId = socketId;
    this.isHero = isHero;
    this.speed = speed;
    scene.physics.add.existing(this);
    this.body.setCircle(16 / 2, -(16 / 2), -(16 / 2));
    this.isServer = isServer;
    this.action = "stand";
    this.direction = "down";
    this.vx = 0;
    this.vy = 0;
    this.state = {
      isIdle: true,
    };
    /* For the server, don't draw this stuff */
    if (isServer) return;
    this.skin = new Phaser.GameObjects.Sprite(this.scene, 0, -12, "dog");
    this.add(this.skin);
    this.texture = "dragon";
    scene.add.existing(this.skin);
    /* Do we really need these? */
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update() {
    if (this.isServer) return;
    updatePlayerDirection(this);
    drawFrame(this);
  }
  hackFrameRate(spriteKey) {
    const keys = { skin: 60000 / this.speed };
    this[spriteKey].anims.msPerFrame = keys[spriteKey];
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}

function drawFrame(player) {
  const newKey = `${player.texture}-${player.direction}-${player.action}`;
  const currentKey = player?.skin?.anims?.currentAnim?.key;
  if (currentKey !== newKey) {
    player.skin.play(newKey, true);
    player.hackFrameRate("skin");
  }
}

function updatePlayerDirection(player) {
  /* Get velocity from server updates if we are not the hero */
  const vx = player?.isHero ? player.body.velocity.x : player.vx;
  const vy = player?.isHero ? player.body.velocity.y : player.vy;
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
