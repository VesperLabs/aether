import Character from "./Character";
import ItemBuilder from "./ItemBuilder";
import { getCharacterDirection, distanceTo, randomNumber, SHOP_INFLATION } from "./utils";
import spellDetails from "../shared/data/spellDetails.json";
import crypto from "crypto";

const AGGRO_KITE_RANGE = 300;
const NPC_SHOULD_ATTACK_RANGE = 8;

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
      abilities = {},
      keeperData = {},
      ...args
    }: {
      name: string;
      equipment: Record<string, Array<string>>;
      abilities: Record<string, Array<string>>;
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
    this.abilities = buildEquipment(abilities);
    this.talkingIds = [];
    this.keeperData = {
      ...keeperData,
      shop: buildShop(keeperData?.shop),
      quests: keeperData?.quests?.map((questId: string) => scene?.quests?.[questId]),
    };
    this.calculateStats(true);
  }
  setDead() {
    this.expireBuffs(true);
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
      this.calculateStats(true);
      this.state.isDead = false;
      this.scene.io
        .to(this.room.name)
        .emit("respawnNpc", { id: this?.id, x: this.x, y: this.y, respawnTime: Date.now() });
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
  update(time: number, delta: number) {
    // Destructure relevant properties from 'this'
    const { scene, state, room } = this ?? {};

    // skip updates if no one is in the room
    if (!room?.playerManager?.hasPlayers()) {
      this.state.lockedPlayerId = null;
      this.vx = 0;
      this.vy = 0;
      this.body.setVelocity(this.vx, this.vy);
      return;
    }

    this.expireBuffs();

    // If dead, do not continue update
    if (state?.isDead) return this.tryRespawn();

    // Regenerate health points
    this.doRegen();

    // Check if attack is ready
    this.checkAttackReady(delta);

    // check if spell is ready
    this.checkCastReady(delta);

    // If is nasty and not locked onto a player, lock onto nearest player
    if (state?.isAggro && !state.lockedPlayerId) {
      const nearestPlayer = room?.playerManager?.getNearestPlayer(this);
      const npcAggroRange = Math.min(20 + this?.baseStats?.level * 2, AGGRO_KITE_RANGE);
      const isInRange = this.checkInRange(nearestPlayer, npcAggroRange);
      if (isInRange) this.state.lockedPlayerId = nearestPlayer?.socketId;
    }

    // Get target player based on locked player ID
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;

    this.chaseOrMove({ targetPlayer, delta, time });
    this.intendAttack({ targetPlayer, delta });
    this.intendCastSpell({ targetPlayer, delta });
  }
  doCast({ ability, abilitySlot, targetPlayer }) {
    const { scene, room, id, state } = this ?? {};

    if (state.isCasting || state?.isDead) return;

    this.state.isCasting = true;
    this.state.lastCast = Date.now();
    const castAngle = Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x);

    room?.spellManager.create({
      caster: this,
      target: targetPlayer,
      spellName: ability?.base,
      castAngle,
      ilvl: ability?.ilvl,
      abilitySlot,
    });

    scene.io
      .to(room?.name)
      .emit("npcCastSpell", { id, castAngle, base: ability?.base, ilvl: ability?.ilvl });
  }
  intendCastSpell({ targetPlayer, delta }) {
    const { state, abilities } = this ?? {};

    if (state.isCasting || state?.isDead) return;

    let ability = null;
    let abilitySlot = null;

    for (const [slot, spell] of Object.entries(abilities)) {
      const details = spellDetails?.[spell?.base];
      if (!details) continue;
      // some spells like buffs have a long wait time, so we skip them
      if (Date.now() - this.state.lastCast < delta + details?.npcCastWait) continue;
      // attack spells
      if (targetPlayer) {
        if (details?.allowedTargets?.includes("enemy") && details?.npcCastRange) {
          const [min, max] = details?.npcCastRange || [];
          const isTargetInRange =
            this.checkInRange(targetPlayer, max) && !this.checkInRange(targetPlayer, min);
          if (isTargetInRange) {
            abilitySlot = slot;
            ability = spell;
          }
        }
      }
    }

    if (ability) {
      this.doCast({ targetPlayer, abilitySlot, ability });
    }
  }
  doAttack() {
    let count = 1;
    const { scene, room, direction, id, state } = this ?? {};
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;
    if (state.isAttacking || state?.isDead) return;
    if (!this.checkInRange(targetPlayer, NPC_SHOULD_ATTACK_RANGE) || targetPlayer?.state?.isDead)
      return;
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
      castAngle: Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x),
      spellName: this.action,
    });

    scene.io.to(room?.name).emit("npcAttack", { id, count, direction });
  }
  intendAttack({ targetPlayer, delta }) {
    const { isAttacking } = this?.state ?? {};
    // Determine if player should attack target player
    const shouldAttackPlayer =
      !isAttacking && this.checkInRange(targetPlayer, NPC_SHOULD_ATTACK_RANGE);

    if (shouldAttackPlayer) {
      // Attack target player after lag delay to ensure we are actually near them
      return setTimeout(() => {
        this.doAttack();
        // Calculate lag delay based on time elapsed
      }, delta);
    }
  }
  stillAggro() {
    return this.state.lockedPlayerId && Date.now() - this.state.lastCombat > 5000;
  }
  chaseOrMove({ targetPlayer, delta, time }) {
    // Check if player is in range for aggro
    const isInRange = this.checkInRange(targetPlayer, AGGRO_KITE_RANGE);
    const shouldStop = this.checkInRange(targetPlayer, NPC_SHOULD_ATTACK_RANGE);

    // Determine if player should chase target
    const shouldChasePlayer = isInRange && !targetPlayer?.state?.isDead;

    // Aggroed
    if (shouldChasePlayer) {
      this.state.bubbleMessage = "!";
      return shouldStop ? this.standStill() : this.moveTowardPoint(targetPlayer);
    }

    // Otherwise just make them move
    this.state.lockedPlayerId = null;
    this.state.bubbleMessage = null;

    /* If the NPC is out of bounds, make it try to get back in bounds */
    if (this.isOutOfBounds()) {
      /* TODO: Improve this so that it moves toward the nearest open tile instead */
      return this.moveTowardPointPathed(this.startingCoords);
    }

    if (this.state.isStatic) {
      return this.moveToSpawnAndWait(delta);
    }

    if (this.talkingIds?.length > 0) {
      return this.checkTalking();
    }

    return this.moveRandomly(time);
  }
  moveTowardPoint(coords: Coordinate) {
    const walkSpeed = this.stats.walkSpeed;
    const angle = Math.atan2(coords.y - this.y, coords.x - this.x);
    this.vx = walkSpeed * Math.cos(angle);
    this.vy = walkSpeed * Math.sin(angle);
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
        // Move the player along the path at the given walkSpeed
        this.moveTowardPoint(nextPath);
      }
    }
  }
  moveRandomly(time: number) {
    if (time % 4 > 1) return;
    const randNumber = Math.floor(Math.random() * 6 + 1);
    const walkSpeed = this.stats.walkSpeed / 2;
    switch (randNumber) {
      case 1:
        this.vx = -walkSpeed;
        this.direction = "left";
        break;
      case 2:
        this.vx = walkSpeed;
        this.direction = "right";
        break;
      case 3:
        this.vy = -walkSpeed;
        this.direction = "up";
        break;
      case 4:
        this.vy = walkSpeed;
        this.direction = "down";
        break;
      default:
        this.vy = 0;
        this.vx = 0;
    }
    this.body.setVelocity(this.vx, this.vy);
  }
  standStill() {
    this.vy = 0;
    this.vx = 0;
    return this.body.setVelocity(this.vx, this.vy);
  }
  moveToSpawnAndWait(delta: number) {
    if (this.checkInRange(this.startingCoords, 1)) {
      setTimeout(() => {
        this.direction = "down";
      }, delta * 4);
      return this.standStill();
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
        let rando = randomNumber(1, 100);
        if (rando <= this.drops[i].chance) {
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
        npcId: this?.id,
      });
    }
  }
}

export default Npc;
