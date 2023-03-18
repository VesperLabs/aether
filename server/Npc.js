import Character from "./Character";
import { getCharacterDirection, distanceTo } from "./utils";
const START_AGGRO_RANGE = 150;

class Npc extends Character {
  constructor(scene, args) {
    super(scene, args);
    this.scene = scene;
    this.state.isRobot = true;
    this.respawnTime = 10000;
  }
  setDead() {
    this.state.isDead = true;
    this.state.deadTime = Date.now();
    this.state.lockedPlayerId = null;
    this.bubbleMessage = null;
    this.vx = 0;
    this.vy = 0;
    this.body.setVelocity(this.vx, this.vy);
  }
  tryRespawn() {
    if (!this.state.isDead) return;
    if (Date.now() - this.state.deadTime >= this.respawnTime) {
      this.state.isDead = false;
      this.stats.hp = this.stats.maxHp;
      this.scene.io.to(this.room.name).emit("respawnNpc", this?.id);
    }
  }
  checkInRange(target, range) {
    if (!target) return;
    return distanceTo(this, target) <= range;
  }
  update(time, delta) {
    const { scene, state, stats, room } = this || {};
    this.doRegen();
    this.tryRespawn();
    this.checkAttackReady(delta);
    if (state.isDead) return;
    if (state.isAggro && !state.lockedPlayerId) {
      state.lockedPlayerId = room?.playerManager?.getNearestPlayer(this)?.socketId;
    }
    const lagDelay = delta;
    const targetPlayer = scene?.players?.[this?.state?.lockedPlayerId];
    const shouldChasePlayer = this.checkInRange(targetPlayer, START_AGGRO_RANGE);
    const shouldAttackPlayer = !state?.isAttacking && this.checkInRange(targetPlayer, delta / 6);
    if (shouldChasePlayer) {
      this.moveTowardPlayer(targetPlayer);
    } else {
      state.lockedPlayerId = null;
      this.moveRandomly(time);
    }
    if (shouldAttackPlayer) {
      this.state.isAttacking = true;
      this.state.lastAttack = Date.now();
      //send a spell to target here?
      setTimeout(() => {
        if (this.checkInRange(targetPlayer, delta / 6) && !this.state.isDead) {
          this.room?.spellManager.create({
            caster: this,
            target: targetPlayer,
            spellName: "attack_right",
          });
        }
      }, lagDelay);
    }
  }
  checkAttackReady(delta) {
    /* Let us attack again when it is ready */
    if (Date.now() - this.state.lastAttack > delta + this.stats.attackDelay) {
      this.state.isAttacking = false;
    }
  }
  moveTowardPlayer(player) {
    const speed = this.stats.speed;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.vx = speed * Math.cos(angle);
    this.vy = speed * Math.sin(angle);
    this.bubbleMessage = "!";
    this.body.setVelocity(this.vx, this.vy);
    this.direction = getCharacterDirection(this, { x: this?.x + this.vx, y: this.y + this.vy });
  }
  moveRandomly(time) {
    if (time % 4 > 1) return;
    const randNumber = Math.floor(Math.random() * 6 + 1);
    const speed = this.stats.speed / 2;
    switch (randNumber) {
      case 1:
        this.vx = -speed;
        this.direction = "left";
        break;
      case 2:
        this.vx = speed;
        this.direction = "right";
        break;
      case 3:
        this.vy = -speed;
        this.direction = "up";
        break;
      case 4:
        this.vy = speed;
        this.direction = "down";
        break;
      default:
        this.vy = 0;
        this.vx = 0;
    }
    this.bubbleMessage = null;
    this.body.setVelocity(this.vx, this.vy);
  }
}

export default Npc;
