import Character from "./Character";
import ItemBuilder from "../shared/ItemBuilder";
import { distanceTo } from "../shared/utils";
import { getCharacterDirection, randomNumber, SHOP_INFLATION } from "./utils";
import spellDetails from "../shared/data/spellDetails.json";
import crypto from "crypto";

const AGGRO_KITE_RANGE = 220;
const NPC_SHOULD_ATTACK_RANGE = 8;
const NPC_ADDED_ATTACK_DELAY = 700;
const NPC_START_ATTACKING_DELAY = 300;

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
      hitBoxSize: any;
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
    this.state.bubbleMessage = null;
    this.setLockedPlayerId(null);
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
    const thisRadius = this?.bodySize || 8;
    const targetRadius = target?.bodySize || 8;
    const distance = distanceTo(this, target) - (thisRadius + targetRadius);
    return distance <= range;
  }
  checkAttackReady(): any {
    const fullAttackDelay = this?.stats?.attackDelay + NPC_ADDED_ATTACK_DELAY;
    if (Date.now() - this.state.lastAttack > fullAttackDelay) {
      this.state.npcAttackReady = true;
      this.state.isAttacking = false;
    }
  }
  // help me write this function.  need to check if the NPC is adjacent to a collision tile.
  isNearCollideTile() {
    let npcTileX = this.room.tileMap.worldToTileX(this.x); // Convert NPC's world x-coordinate to tile x-coordinate
    let npcTileY = this.room.tileMap.worldToTileY(this.y); // Convert NPC's world y-coordinate to tile y-coordinate

    // Define all neighboring tile coordinates (including diagonals)
    const neighboringTiles = [
      { x: npcTileX - 1, y: npcTileY }, // Left
      { x: npcTileX + 1, y: npcTileY }, // Right
      { x: npcTileX, y: npcTileY - 1 }, // Up
      { x: npcTileX, y: npcTileY + 1 }, // Down
      { x: npcTileX - 1, y: npcTileY - 1 }, // Diagonal Up-Left
      { x: npcTileX + 1, y: npcTileY - 1 }, // Diagonal Up-Right
      { x: npcTileX - 1, y: npcTileY + 1 }, // Diagonal Down-Left
      { x: npcTileX + 1, y: npcTileY + 1 }, // Diagonal Down-Right
    ];

    // Check if any neighboring tile has a collision property
    for (const tileCoords of neighboringTiles) {
      const tile = this.room.collideLayer?.getTileAt(tileCoords.x, tileCoords.y);
      if (tile?.properties?.collides) {
        return true; // Found a neighboring collision tile
      }
    }

    return false; // No neighboring collision tile found
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
      this.setLockedPlayerId(null);
      this.vx = 0;
      this.vy = 0;
      this.body.setVelocity(this.vx, this.vy);
      this.stats.hp = this.stats.maxHp; //heal to full
      return;
    }

    this.checkIsResting();
    this.expireBuffs();

    // If dead, do not continue update
    if (state?.isDead) return this.tryRespawn();

    // Regenerate health points
    this.doRegen();

    // Check if attack is ready
    this.checkAttackReady();

    // If is nasty and not locked onto a player, lock onto nearest player
    if (state?.isAggro && !state.lockedPlayerId) {
      const nearestPlayer = room?.playerManager?.getNearestPlayer(this);
      const npcAggroRange = Math.min(10 + this?.baseStats?.level * 8, AGGRO_KITE_RANGE);
      const isInRange = this.checkInRange(nearestPlayer, npcAggroRange);
      if (isInRange) this.setLockedPlayerId(nearestPlayer?.socketId);
    }

    // Get target player based on locked player ID
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;

    // If we killed the player already, do not target them anymore
    if (targetPlayer?.state?.isDead) {
      this.setLockedPlayerId(null);
    }

    if (this.hasBuff("stun")) {
      return this.standStill();
    }

    this.chaseOrMove({ targetPlayer, delta, time });
    this.intendAttack({ targetPlayer });
    this.intendCastSpell({ targetPlayer, delta });
  }
  setLockedPlayerId(id: string) {
    // If they are switching targets
    if (this.state.lockedPlayerId !== id && id) {
      this.state.lastAttack = Date.now();
      this.state.npcAttackReady = false;
    }
    this.state.lockedPlayerId = id;
  }
  doCast({ ability, abilitySlot, targetPlayer }) {
    if (!this.canCastSpell(abilitySlot)) return;

    const { scene, room, id } = this ?? {};
    const spellName = ability?.base;

    this.state.lastCast.global = Date.now();
    if (spellName) {
      this.state.lastCast[spellName] = Date.now();
    }
    const castAngle = (this.state.lastAngle = Math.atan2(
      targetPlayer.y - this.y,
      targetPlayer.x - this.x
    ));

    room?.spellManager.create({
      caster: this,
      target: targetPlayer,
      spellName,
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

    if (!this.checkCastReady() || state?.isDead) return;

    let ability = null;
    let abilitySlot = null;

    for (const [slot, spell] of Object.entries(abilities)) {
      const details = spellDetails?.[spell?.base];
      if (!details) continue;
      // some spells like buffs have a long wait time, so we skip them
      if (Date.now() - this.state.lastCast.global < delta + details?.npcCastWait) continue;
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
  doAttack({ target, castAngle }) {
    const { scene, room, direction, id, state } = this ?? {};
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;
    if (state.isAttacking || state?.isDead) return;
    if (!targetPlayer || targetPlayer?.state?.isDead) return;

    // decides what hand ot hit with
    const count = this.action === "attack_right" && this.hasWeaponLeft() ? 2 : 1;
    // Set state to attacking and record attack time
    this.state.isAttacking = true;
    this.state.isAiming = false;
    this.state.lastAttack = Date.now();
    this.state.npcAttackReady = false;

    /* Switch hands if possible */
    const { spellName } = this.getAttackActionName({ count });
    this.action = spellName;

    room?.spellManager.create({
      caster: this,
      target,
      spellName: this.action,
      castAngle,
      ilvl: 1,
    });

    scene.io.to(room?.name).emit("npcAttack", { id, count, direction, castAngle });
  }
  async intendAttack({ targetPlayer }) {
    const { isAttacking, npcAttackReady, isAiming } = this?.state ?? {};

    // Determine if player should attack target player
    const shouldAttackPlayer =
      !isAttacking && !isAiming && this.checkInRange(targetPlayer, this.getShouldAttackRange());

    if (shouldAttackPlayer && npcAttackReady) {
      this.direction = getCharacterDirection(this, targetPlayer);
      this.state.isAiming = true;
      this.state.bubbleMessage = "!";

      const castAngle = (this.state.lastAngle = Math.atan2(
        targetPlayer.y - this.y,
        targetPlayer.x - this.x
      ));

      const target = {
        id: targetPlayer.id,
        x: targetPlayer.x,
        y: targetPlayer.y,
      };

      await new Promise((resolve) => setTimeout(resolve, NPC_START_ATTACKING_DELAY));
      this.doAttack({ target, castAngle });
    }
  }
  stillAggro() {
    return this.state.lockedPlayerId && Date.now() - this.state.lastCombat > 5000;
  }
  chaseOrMove({ targetPlayer, delta, time }) {
    // Check if player is in range for aggro
    const isInRange = this.checkInRange(targetPlayer, AGGRO_KITE_RANGE);
    const shouldStop =
      this.checkInRange(targetPlayer, this.getShouldAttackRange()) || this.state.isAiming;

    // Determine if player should chase target
    const shouldChasePlayer = isInRange && !targetPlayer?.state?.isDead;

    // Aggroed
    if (shouldChasePlayer) {
      if (!this.state.isAiming) this.state.bubbleMessage = "?";
      if (shouldStop) {
        return this.standStill();
      }
      if (this.isNearCollideTile()) {
        return this.moveTowardPointPathed(targetPlayer);
      } else {
        return this.moveTowardPoint(targetPlayer);
      }
    }

    // Otherwise just make them move
    this.setLockedPlayerId(null);
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

    if (this.state.walkRange) {
      if (distanceTo(this, this.startingCoords) >= this.state.walkRange) {
        return this.moveTowardPoint(this.startingCoords);
      }
    }

    return this.moveRandomly(time);
  }
  getShouldAttackRange() {
    if (this?.hasRangedWeaponLeft()) {
      return this?.getWeaponRange("handLeft");
    }
    if (this?.hasRangedWeaponRight()) {
      return this?.getWeaponRange("handRight");
    }
    /* TODO: melee attack range too? */
    return NPC_SHOULD_ATTACK_RANGE;
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
      this.moveTowardPoint(nextPath);
      if (this.checkInRange(nextPath, 1)) {
        this.nextPath = null;
      }
    }
  }
  moveRandomly(time: number) {
    const changeDirectionDelay = 7; // Number of iterations before changing direction
    const walkSpeed = this.stats.walkSpeed / 2;

    if (time % changeDirectionDelay > 1) {
      // Keep moving in the current direction
      this.body.setVelocity(this.vx, this.vy);
      return;
    }

    const randNumber = Math.floor(Math.random() * 7 + 1); // Adjusted the range to 1-4
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
  doHit(ids: any, abilitySlot: any): void {
    const { scene } = this ?? {};
    const roomName: string = this?.room?.name;
    const players: Array<ServerPlayer> =
      scene.roomManager.rooms[roomName]?.playerManager?.getPlayers();

    const abilityName = this?.abilities?.[abilitySlot]?.base || "attack_left";
    const allowedTargets = spellDetails?.[abilityName]?.allowedTargets;
    const targetIsInParty = false;

    let hitList: Array<Hit> = [];

    for (const player of players) {
      /* TODO: verify location of hit before we consider it a hit */
      if (!ids?.includes(player.id)) continue;
      // only allow spells to hit intended targets
      if (!allowedTargets?.includes("self")) {
        if (player.id === this.id) continue;
      }
      if (!allowedTargets?.includes("enemy")) {
        if (player.id !== this.id && !targetIsInParty) continue;
      }
      if (!allowedTargets.includes("ally")) {
        if (targetIsInParty) continue;
      }
      const newHits = this.calculateDamage(player, abilitySlot);

      if (newHits?.length > 0) hitList = [...hitList, ...newHits];
    }

    scene.io.to(roomName).emit("assignDamage", hitList);
  }
  dropLoot(magicFind: number) {
    let runners = [];
    const ilvl = 1 + Math.floor(this.stats.level / 5);

    if (!this.state.noWorldDrops) {
      const mainDrop = ItemBuilder.rollDrop(ilvl, magicFind);
      if (mainDrop) runners.push(mainDrop);
    }
    /* World drops table */
    if (this.drops) {
      for (var i = 0; i < this.drops.length; i++) {
        let rando = randomNumber(1, this.drops[i].chance);
        if (rando === 1) {
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
      if (runners[i].type !== "stackable") break;
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
