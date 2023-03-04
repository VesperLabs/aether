import Phaser from "phaser";

class Character extends Phaser.GameObjects.Container {
  constructor(scene, args) {
    const {
      x,
      y,
      socketId,
      id,
      isHero = false,
      isServer = false,
      room,
      equips,
      profile,
      stats,
      bubbleMessage,
      isAggro,
    } = args;
    super(scene, x, y, []);
    this.startingCoords = { x, y };
    this.socketId = socketId;
    this.id = id;
    this.isHero = isHero;
    this.isAggro = isAggro;
    this.room = room;
    this.isServer = isServer;
    this.action = "stand";
    this.direction = "down";
    this.currentSpeed = 0;
    this.vx = 0;
    this.vy = 0;
    this.state = {
      lastAttack: Date.now(),
      isIdle: true,
      isAttacking: false,
      hasWeaponRight: false,
      hasWeaponLeft: false,
    };
    this.profile = profile;
    this.equips = equips;
    this.stats = stats;
    this.bubbleMessage = bubbleMessage;
    scene.physics.add.existing(this);
    this.body.setCircle(8, -8, -8);
  }
}

export default Character;
