import Phaser from "phaser";

class Character extends Phaser.GameObjects.Container {
  startingCoords: Coordinate;
  socketId: string;
  id: string;
  isHero: boolean;
  roomName: string;
  room: Room;
  action: string;
  direction: string;
  currentSpeed: number;
  nextPath: Coordinate;
  vx: any;
  vy: any;
  kind: any;
  gold: any;
  profile: any;
  equipment: Record<string, Item>;
  inventory: any;
  baseStats: any;
  stats: any;
  declare body: Phaser.Physics.Arcade.Body;
  declare state: any;
  constructor(scene, args) {
    const {
      x,
      y,
      socketId,
      id,
      isHero = false,
      room,
      equipment = {},
      inventory = [],
      profile,
      stats = {},
      kind,
      roomName,
      baseStats = {},
      direction,
      state = {},
      gold = 0,
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
      lastFlash: Date.now(),
      setFlash: false,
      isIdle: true,
      isAttacking: false,
      hasWeaponRight: false,
      hasWeaponLeft: false,
      isDead: false,
      activeSets: [],
      ...state,
    };
    this.gold = gold;
    this.profile = { headY: -47, ...profile };
    this.equipment = equipment;
    this.inventory = inventory;
    this.baseStats = baseStats;
    this.stats = stats;
    scene.physics.add.existing(this);
    const bodySize = 8 * (this?.profile?.scale || 1);
    this.body.setCircle(bodySize, -bodySize, -bodySize);
    this.checkAttackHands();
  }
  doAttack(count: integer) {
    //placeholder
  }
  modifyStat(key: string, amount: number) {
    const stat: number = this?.stats?.[key];
    const maxStat = this?.stats?.["max" + capitalize(key)];
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
    this.stats[key] += amount.toFixed(0);
  }
  checkAttackReady(delta) {
    // let attackDelay = 0;
    // if (p.action === "attack_right") attackDelay = p?.equipment?.handRight?.stats?.attackDelay;
    // if (p.action === "attack_left") attackDelay = p?.equipment?.handLeft?.stats?.attackDelay;
    if (Date.now() - this.state.lastAttack > delta + this?.stats?.attackDelay) {
      this.state.isAttacking = false;
    }
  }
  triggerSecondAttack() {
    if (this.action === "attack_right" && this.state.hasWeaponLeft) {
      this.doAttack(2);
    }
  }
  checkAttackHands() {
    this.state.hasWeaponRight = false;
    this.state.hasWeaponLeft = false;
    this.state.hasWeapon = false;
    /* Can only attack with a hand if it contains a weapon type item  */
    const leftType = this.equipment?.handLeft?.type;
    const rightType = this.equipment?.handRight?.type;
    if (rightType === "weapon") this.state.hasWeaponRight = true;
    if (leftType === "weapon") this.state.hasWeaponLeft = true;
    if (this.state.hasWeaponRight || this.state.hasWeaponLeft) this.state.hasWeapon = true;
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

function capitalize(str) {
  if (str.length == 0) return str;
  return str[0].toUpperCase() + str.substr(1);
}

export default Character;
