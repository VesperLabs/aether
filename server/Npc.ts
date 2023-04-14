import Character from "./Character";
import ItemBuilder from "./ItemBuilder";
import QuestBuilder from "./QuestBuilder";
import { getCharacterDirection, distanceTo, randomNumber, SHOP_INFLATION } from "./utils";
import crypto from "crypto";

const START_AGGRO_RANGE = 150;

const buildEquipment = (equipment: Record<string, Array<string>>) =>
  Object?.entries(equipment).reduce((acc, [slot, itemArray]: [string, BuildItem]) => {
    acc[slot] = itemArray?.length ? ItemBuilder.buildItem(...itemArray) : null;
    return acc;
  }, {});

const buildShop = (shop: Array<any>) => {
  return shop?.reduce((acc, entry) => {
    const id = crypto.randomUUID();
    const item: Item | void = ItemBuilder.buildItem(...entry.item);
    if (item) item.cost = Math.round(item.cost * SHOP_INFLATION);
    acc.push({ id, ...entry, item });
    return acc;
  }, []);
};

const buildQuests = (quests: Array<any>) => {
  return quests?.reduce((acc, entry) => {
    acc.push(QuestBuilder.buildQuest(entry));
    return acc;
  }, []);
};

class Npc extends Character implements Npc {
  public respawnTime: number;
  public drops: Array<Drop>;
  public talkingIds: Array<string>;
  public keeperData: KeeperData;
  declare name: string;
  constructor(
    scene: ServerScene,
    {
      equipment = {},
      keeperData = {},
      ...args
    }: {
      name: string;
      equipment: Record<string, Array<string>>;
      keeperData: KeeperData;
      drops: Array<Drop>;
    }
  ) {
    super(scene, args);
    this.name = args?.name;
    this.scene = scene;
    this.state.isRobot = true;
    this.respawnTime = 10000;
    this.drops = args?.drops;
    this.equipment = buildEquipment(equipment);
    this.talkingIds = [];
    this.keeperData = {
      ...keeperData,
      shop: buildShop(keeperData?.shop),
      quests: buildQuests(keeperData?.quests),
    };
  }
  setDead() {
    this.state.isDead = true;
    this.state.deadTime = Date.now();
    this.state.lockedPlayerId = null;
    this.state.bubbleMessage = null;
    this.vx = 0;
    this.vy = 0;
    this.body.setVelocity(this.vx, this.vy);
  }
  tryRespawn() {
    if (!this.state.isDead) return;
    if (Date.now() - this.state.deadTime >= this.respawnTime) {
      this.x = this.startingCoords.x;
      this.y = this.startingCoords.y;
      this.stats.hp = this.stats.maxHp;
      this.state.isDead = false;
      this.scene.io.to(this.room.name).emit("respawnNpc", { id: this?.id, x: this.x, y: this.y });
    }
  }
  checkInRange(target: any, range: number) {
    if (!target) return;
    const thisRadius = this?.body?.radius || 8;
    const targetRadius = target?.body?.radius || 8;
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
      !this.room.collideLayer?.getTileAt(npcTileX, npcTileY)?.properties?.collides // Check for collision with tile properties
    ) {
      return false;
    }
    return true;
  }
  doAttack() {
    let count = 1;
    const { scene, room, direction, id, state } = this ?? {};
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;
    if (state.isAttacking || state?.isDead) return;
    if (!this.checkInRange(targetPlayer, 1) || targetPlayer?.state?.isDead) return;
    // Set state to attacking and record attack time
    this.state.isAttacking = true;
    this.state.lastAttack = Date.now();

    /* Switch hands if possible */
    if (this.action === "attack_right" && this.state.hasWeaponLeft) {
      this.action = "attack_left";
      count = 2;
    } else {
      this.action = "attack_right";
    }

    room?.spellManager.create({
      caster: this,
      target: targetPlayer,
      spellName: this.action,
    });

    scene.io.to(room?.name).emit("npcAttack", { id, count, direction });
  }
  update(time: number, delta: number) {
    // Destructure relevant properties from 'this'
    const { scene, state, room } = this ?? {};

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

    // Get target player based on locked player ID
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;

    // Check if player is in range for aggro
    const isInRange = this.checkInRange(targetPlayer, START_AGGRO_RANGE);

    // Determine if player should chase target player or move randomly
    const shouldChasePlayer = isInRange && !targetPlayer?.state?.isDead;
    if (shouldChasePlayer) {
      this.moveTowardPoint(targetPlayer);
      this.state.bubbleMessage = "!";
    } else {
      this.state.lockedPlayerId = null;
      /* If the NPC is out of bounds, make it try to get back in bounds */
      if (this.isOutOfBounds()) {
        /* TODO: Improve this so that it moves toward the nearest open tile instead */
        this.moveTowardPointPathed(this.startingCoords);
      } else {
        this.state.bubbleMessage = null;
        if (this.state.isStatic) {
          this.moveToSpawnAndWait(delta);
        } else {
          if (this.talkingIds?.length > 0) {
            this.checkTalking();
          } else {
            this.moveRandomly(time);
          }
        }
      }
    }

    // Determine if player should attack target player
    const shouldAttackPlayer = !state?.isAttacking && this.checkInRange(targetPlayer, 1);

    if (shouldAttackPlayer) {
      // Attack target player after lag delay to ensure we are actually near them
      setTimeout(() => {
        this.doAttack();
        // Calculate lag delay based on time elapsed
      }, delta);
    }
  }
  moveTowardPoint(coords: Coordinate) {
    const speed = this.stats.speed;
    const angle = Math.atan2(coords.y - this.y, coords.x - this.x);
    this.vx = speed * Math.cos(angle);
    this.vy = speed * Math.sin(angle);
    this.body.setVelocity(this.vx, this.vy);
    this.direction = getCharacterDirection(this, { x: this?.x + this.vx, y: this.y + this.vy });
  }
  moveTowardPointPathed(targetCoords: Coordinate) {
    const { nextPath } = this ?? {};
    this.room.findPath(this, targetCoords);
    if (nextPath) {
      if (this.checkInRange(nextPath, 1)) {
        this.nextPath = null;
      } else {
        // Move the player along the path at the given speed
        this.moveTowardPoint(nextPath);
      }
    }
  }
  moveRandomly(time: number) {
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
    this.body.setVelocity(this.vx, this.vy);
  }
  moveToSpawnAndWait(delta: number) {
    if (this.checkInRange(this.startingCoords, 1)) {
      this.vy = 0;
      this.vx = 0;
      setTimeout(() => {
        this.direction = "down";
      }, delta * 4);
      return this.body.setVelocity(this.vx, this.vy);
    }
    this.moveTowardPointPathed(this.startingCoords);
  }
  checkTalking() {
    const scene = this.scene;
    this.vy = 0;
    this.vx = 0;
    this.body.setVelocity(this.vx, this.vy);

    for (const playerId of this.talkingIds) {
      const player = scene?.players?.[playerId];
      if (!this.checkInRange(player, 80)) {
        const index = this.talkingIds.indexOf(playerId);
        if (index !== -1) {
          this.talkingIds.splice(index, 1);
        }
      }
    }
  }
  dropLoot(magicFind: number) {
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
