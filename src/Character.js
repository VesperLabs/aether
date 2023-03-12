import Phaser from "phaser";

class Character extends Phaser.GameObjects.Container {
  constructor(scene, args) {
    const {
      x,
      y,
      socketId,
      id,
      isHero = false,
      room,
      equipment = {},
      profile,
      stats = {},
      bubbleMessage,
      kind,
      roomName,
      baseStats = {},
      direction,
      state = {},
    } = args;
    super(scene, x, y, []);
    this.startingCoords = { x, y };
    this.socketId = socketId;
    this.id = id;
    this.isHero = isHero;
    this.roomName = roomName;
    this.room = room;
    this.action = "stand";
    this.direction = direction || "down";
    this.currentSpeed = 0;
    this.vx = 0;
    this.vy = 0;
    this.kind = kind;
    this.state = {
      isRobot: false,
      isAggro: false,
      doHpRegen: false,
      doMpRegen: false,
      lastTeleport: Date.now(),
      deadTime: Date.now(),
      lastHpRegen: Date.now(),
      lastMpRegen: Date.now(),
      lastCombat: Date.now(),
      lastRegen: Date.now(),
      lastAttack: Date.now(),
      isIdle: true,
      isAttacking: false,
      hasWeaponRight: false,
      hasWeaponLeft: false,
      isDead: false,
      ...state,
    };
    this.profile = profile;
    this.equipment = equipment;
    this.baseStats = baseStats;
    this.stats = stats;
    this.bubbleMessage = bubbleMessage;
    scene.physics.add.existing(this);
    const bodySize = 8 * (this?.profile?.scale || 1);
    this.body.setCircle(bodySize, -bodySize, -bodySize);
  }
  modifyStat(key, amount) {
    const stat = this?.stats?.[key];
    const maxStat = this?.stats?.["max" + key?.charAt?.(0).toUpperCase?.()];
    if (typeof stat === undefined) return;
    if (typeof maxStat === undefined) return;
    if (stat + amount > maxStat) {
      this.stats[key] = maxStat;
      return;
    }
    if (stat + amount < 0) {
      this.stats[key] = 0;
      return;
    }
    this.stats[key] += amount;
  }
}

export default Character;
