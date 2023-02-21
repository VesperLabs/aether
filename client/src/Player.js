const Phaser = require("phaser");

class Player extends Phaser.GameObjects.Container {
  constructor(
    scene,
    { x, y, socketId, isHero = false, isServer = false, speed = 300, room }
  ) {
    super(scene, x, y, []);
    this.startingCoords = { x, y };
    this.socketId = socketId;
    this.isHero = isHero;
    this.speed = speed;
    this.room = room;
    this.isServer = isServer;
    this.action = "stand";
    this.direction = "down";
    this.currentSpeed = 0;
    this.vx = 0;
    this.vy = 0;
    this.state = {
      isIdle: true,
    };
    scene.physics.add.existing(this);
    this.body.setCircle(8, -8, -8);
    this.body.setBounceX(100);
    /* For the server, don't draw this stuff */
    if (isServer) return;
    this.texture = "dragon";
    this.skin = scene.add.existing(
      new Phaser.GameObjects.Sprite(this.scene, 0, -12, this.texture)
    );
    this.add(this.skin);
    /* Do we really need these? */
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update() {
    if (this.isServer) return;
    updatePlayerDirection(this);
    drawFrame(this);
  }
  hackFrameRate(spriteKey, rate) {
    this[spriteKey].anims.msPerFrame = rate;
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
  const currentFrame = player?.skin?.anims?.currentFrame?.index || 0;
  if (currentKey !== newKey) {
    player.skin.play(newKey, true, currentFrame);
  }
  player.hackFrameRate(
    "skin",
    Math.round(80 + 2500 / (player.currentSpeed + 1))
  );
}

function updatePlayerDirection(player) {
  /* Get velocity from server updates if we are not the hero */
  const vx = player?.isHero ? player.body.velocity.x : player.vx;
  const vy = player?.isHero ? player.body.velocity.y : player.vy;

  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

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
