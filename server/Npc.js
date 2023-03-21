import Character from "./Character";
import ItemBuilder from "./ItemBuilder";
import { getCharacterDirection, distanceTo, randomNumber } from "./utils";
const START_AGGRO_RANGE = 150;

class Npc extends Character {
  constructor(scene, args) {
    super(scene, args);
    this.scene = scene;
    this.state.isRobot = true;
    this.respawnTime = 10000;
    this.drops = args?.drops;
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
    const thisRadius = this?.body?.radius || 1;
    const targetRadius = target?.body?.radius || 1;
    const distance = distanceTo(this, target) - (thisRadius + targetRadius);
    return distance <= range;
  }
  isOutOfBounds() {
    let npcTileX = this.room.tileMap.worldToTileX(this.x); // Convert NPC's world x-coordinate to tile x-coordinate
    let npcTileY = this.room.tileMap.worldToTileY(this.y); // Convert NPC's world y-coordinate to tile y-coordinate
    if (
      this.x >= 0 && // Check if this is within left boundary of tilemap
      this.y >= 0 && // Check if this is within top boundary of tilemap
      this.x < this.room.tileMap?.widthInPixels && // Check if this is within right boundary of tilemap
      this.y < this.room.tileMap?.heightInPixels && // Check if this is within bottom boundary of tilemap
      !this.room.collideLayer?.hasTileAt(npcTileX, npcTileY, true) // Check for collision with tile properties
    ) {
      return false;
    }
    return true;
  }
  update(time, delta) {
    // Destructure relevant properties from 'this'
    const { scene, state, stats, room } = this ?? {};

    // Regenerate health points
    this.doRegen();

    // Attempt to respawn if dead
    this.tryRespawn();

    // Check if attack is ready
    this.checkAttackReady(delta);

    // If dead, do not continue update
    if (state?.isDead) return;

    // If is nasty and not locked onto a player, lock onto nearest player
    if (state?.isAggro && !state.lockedPlayerId) {
      const nearestPlayer = room?.playerManager?.getNearestPlayer(this);
      this.state.lockedPlayerId = nearestPlayer?.socketId;
    }

    // Calculate lag delay based on time elapsed
    const lagDelay = delta;

    // Get target player based on locked player ID
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;

    // Check if player is in range for aggro
    const isInRange = this.checkInRange(targetPlayer, START_AGGRO_RANGE);

    // Determine if player should chase target player or move randomly
    const shouldChasePlayer = isInRange && !targetPlayer?.state?.isDead;
    if (shouldChasePlayer) {
      this.moveTowardPoint(targetPlayer);
      this.bubbleMessage = "!";
    } else {
      this.state.lockedPlayerId = null;
      /* If the NPC is out of bounds, make it try to get back in bounds */
      if (this.isOutOfBounds()) {
        /* TODO: Improve this so that it moves toward the nearest open tile instead */
        this.moveTowardPoint(this.startingCoords);
      } else {
        this.moveRandomly(time);
      }
    }

    // Determine if player should attack target player
    const shouldAttackPlayer = !state?.isAttacking && this.checkInRange(targetPlayer, 1);
    if (shouldAttackPlayer) {
      // Set state to attacking and record attack time
      this.state.isAttacking = true;
      this.state.lastAttack = Date.now();

      // Attack target player after lag delay
      setTimeout(() => {
        if (
          this.checkInRange(targetPlayer, 1) &&
          !this.state?.isDead &&
          !targetPlayer?.state?.isDead
        ) {
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
  moveTowardPoint(player) {
    const speed = this.stats.speed;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.vx = speed * Math.cos(angle);
    this.vy = speed * Math.sin(angle);
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
  dropLoot(magicFind) {
    const ilvl = 1 + Math.floor(this.stats.level / 10);
    const mainDrop = ItemBuilder.rollDrop(ilvl, magicFind);
    let runners = [];
    if (mainDrop) {
      runners.push(mainDrop);
    }
    if (this.drops) {
      for (var i = 0; i < this.drops.length; i++) {
        let rando = randomNumber(1, this.drops[i].chance);
        if (rando == this.drops[i].chance) {
          runners.push(this.drops[i]);
        }
      }
    }
    let item = null;
    for (var i = 0; i < runners.length; i++) {
      item = runners[i];
      /* Preferences */
      if (runners[i].rarity == "unique") break;
      if (runners[i].rarity == "set") break;
      if (runners[i].rarity == "rare") break;
      if (runners[i].rarity == "magic") break;
      if (runners[i].type != "stackable") break;
    }
    /* Spawn the loot on the server */

    if (item) {
      this.room.lootManager.create({
        x: this?.x,
        y: this?.y,
        item: ItemBuilder.buildItem(item.type, item.rarity, item.key),
      });
    }
  }
}

export default Npc;
