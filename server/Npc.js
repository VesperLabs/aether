import Character from "../src/Character";

const START_AGGRO_RANGE = 120;

class Npc extends Character {
  constructor(scene, room, args) {
    super(scene, args);
    this.room = room;
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update(time) {
    const player = this.room?.players?.getChildren()?.[0];
    const isNearPlayer = player && this.distanceTo(player) <= START_AGGRO_RANGE;
    if (this.isAggro && player && isNearPlayer) {
      this.moveTowardPlayer(player);
    } else {
      this.moveRandomly(time);
    }
  }
  distanceTo(other) {
    let dx = other.x - this.x;
    let dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  moveTowardPlayer(player) {
    const speed = this.stats.speed;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.vx = speed * Math.cos(angle);
    this.vy = speed * Math.sin(angle);
    this.bubbleMessage = "!";
    this.body.setVelocity(this.vx, this.vy);
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
