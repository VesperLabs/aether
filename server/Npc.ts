import Character from "./Character";
import ItemBuilder from "../shared/ItemBuilder";
import {
  BUFF_SPELLS,
  ILVL_MULTIPLIER,
  calculateStealthVisibilityPercent,
  distanceTo,
} from "../shared/utils";
import { getCharacterDirection, randomNumber, SHOP_INFLATION, sleep } from "./utils";
import spellDetails from "../shared/data/spellDetails.json";
import crypto from "crypto";

const AGGRO_KITE_RANGE = 220;
const NPC_SHOULD_ATTACK_RANGE = 8;
// both combined is time between attacks. game designed to have ~ 700 total. (500 here + stats.attackDelay below)
const NPC_ATTACK_ADDED_DELAY = 300;
const NPC_WARNING_DELAY = 200;

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
      this.scene.io.to(this.room.name).emit("respawnNpc", {
        id: this?.id,
        x: this.x,
        y: this.y,
        respawnTime: Date.now(),
      });
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
    const fullAttackDelay = this?.stats?.attackDelay + NPC_ATTACK_ADDED_DELAY;
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

    if (state?.isAggro) {
      this.handleAggroState();
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
    this.intendCastSpell({ targetPlayer });
  }
  // targetPlayer is only supplied when we already have a lockedtar
  handleAggroState() {
    const { room, state, scene } = this ?? {};

    const nearestPlayer =
      scene?.players?.[state?.lockedPlayerId] || room?.playerManager?.getNearestPlayer(this);

    if (!nearestPlayer) {
      return false; // Early return if no nearest player found
    }

    const npcAggroRange = state?.lockedPlayerId
      ? AGGRO_KITE_RANGE // running away from the NPC
      : calculateNpcAggroRange(this, AGGRO_KITE_RANGE); // NPC has not aggroed us yet
    if (!this.checkInRange(nearestPlayer, npcAggroRange)) {
      return false; // Early return if player is out of range
    }

    const stealthBuff = nearestPlayer.getBuff("stealth");
    if (stealthBuff) {
      const newNpcAggroRange = calculateStealthAggroRange({
        nearestPlayer,
        npc: this,
        npcAggroRange,
        stealthBuff,
      });
      if (!this.checkInRange(nearestPlayer, newNpcAggroRange)) {
        return false; // Early return if stealth player is out of adjusted range
      }
    }

    this.setLockedPlayerId(nearestPlayer?.socketId);
    return true;
  }
  setLockedPlayerId(id: string) {
    // If they are switching targets
    if (this.state.lockedPlayerId !== id && id) {
      this.state.lastAttack = Date.now();
      this.state.npcAttackReady = false;
    }
    this.state.lockedPlayerId = id;
  }
  doCast({ ability, abilitySlot, targetPlayer, castAngle }) {
    if (!this.canCastSpell(abilitySlot)) return;

    const { scene, room, id } = this ?? {};
    const spellName = ability?.base;

    this.dispelBuffsByProperty("dispelOnCast", true);

    room?.spellManager.create({
      caster: this,
      target: targetPlayer,
      spellName,
      castAngle,
      ilvl: ability?.ilvl,
      abilitySlot,
    });

    scene.io.to(room?.name).emit("npcCastSpell", { id, castAngle, abilitySlot });
  }
  async intendCastSpell({ targetPlayer }) {
    if (!this.checkCastReady() || this?.state?.isDead || this?.state?.isAiming) return;

    const { ability, abilitySlot, castAngle } = this.findSuitableAbility(targetPlayer);

    if (ability) {
      this.state.isAiming = true;
      await sleep(NPC_WARNING_DELAY + this?.stats?.castDelay);
      this.doCast({ targetPlayer, abilitySlot, ability, castAngle });
      this.state.isAiming = false;
    }
  }
  findSuitableAbility(targetPlayer) {
    for (const [slot, spell] of Object.entries(this.abilities)) {
      if (this.isSpellCastable(spell) && this.isTargetSuitableForSpell(targetPlayer, spell)) {
        return {
          ability: spell,
          abilitySlot: slot,
          castAngle: targetPlayer
            ? Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x)
            : 0,
        };
      }
    }
    return {};
  }
  isSpellCastable(spell) {
    const spellName = spell?.base;
    const details = spellDetails?.[spellName];
    return details && this.checkCastReady(spellName);
  }
  isTargetSuitableForSpell(targetPlayer, spell) {
    const spellName = spell?.base;
    const details = spellDetails?.[spellName];

    // attack spells
    if (targetPlayer && details?.allowedTargets?.includes("enemy") && details?.npcCastRange) {
      const [min, max] = details.npcCastRange;
      return this.checkInRange(targetPlayer, max) && !this.checkInRange(targetPlayer, min);
    }
    // auras
    if (!targetPlayer && details?.allowedTargets?.includes("self")) {
      if (BUFF_SPELLS.includes(spellName)) {
        const targetProbability = 0.01; // 1% chance to consider the target suitable
        const randomCheck = Math.random() < targetProbability; // Random check
        // if we already have the buff, don't recast
        return !this.hasBuff(spellName) && randomCheck;
      }
    }
  }
  doAttack({ target, direction, castAngle }) {
    const { scene, room, id, state } = this ?? {};
    const targetPlayer = scene?.players?.[state?.lockedPlayerId] ?? null;
    if (state.isAttacking || state?.isDead) return;
    if (!targetPlayer || targetPlayer?.state?.isDead) return;

    // decides what hand ot hit with
    const count = this.action === "attack_right" && this.hasWeaponLeft() ? 2 : 1;
    // Set state to attacking and record attack time
    this.state.isAttacking = true;
    this.state.lastAttack = Date.now();
    this.state.npcAttackReady = false;

    if (this?.hasBuff("stun")) return;

    /* Switch hands if possible */
    const { spellName, action } = this.getAttackActionName({ count });
    this.action = action;

    this.dispelBuffsByProperty("dispelOnAttack", true);

    room?.spellManager.create({
      caster: this,
      target,
      spellName,
      direction,
      action,
      castAngle,
      ilvl: 1,
    });

    scene.io.to(room?.name).emit("npcAttack", { id, count, direction, castAngle });
  }
  async intendAttack({ targetPlayer }) {
    const { isAttacking, npcAttackReady, isAiming } = this?.state ?? {};

    if (!targetPlayer) return;

    // Determine if player should attack target player
    const shouldAttackPlayer =
      !isAttacking && !isAiming && this.checkInRange(targetPlayer, this.getShouldAttackRange());

    if (shouldAttackPlayer && npcAttackReady) {
      this.direction = getCharacterDirection(this, targetPlayer);
      this.state.isAiming = true;

      const castAngle = (this.state.lastAngle = Math.atan2(
        targetPlayer.y - this.y,
        targetPlayer.x - this.x
      ));

      const direction = `${this.direction}`;

      const target = {
        id: targetPlayer.id,
        x: targetPlayer.x,
        y: targetPlayer.y,
      };

      await sleep(NPC_WARNING_DELAY + this?.stats?.attackDelay);
      this.doAttack({ target, direction, castAngle });
      this.state.isAiming = false;
    }
  }
  stillAggro() {
    return this.state.lockedPlayerId && Date.now() - this.state.lastCombat > 5000;
  }
  chaseOrMove({ targetPlayer, delta, time }) {
    // Check if player is in range for aggro

    if (targetPlayer) {
      const isInRange = this.handleAggroState();
      const shouldStop =
        this.checkInRange(targetPlayer, this.getShouldAttackRange()) ||
        this.state.isAiming ||
        this.state.isAttacking;

      // Determine if player should chase target
      const shouldChasePlayer = isInRange && !targetPlayer?.state?.isDead;

      // Aggroed
      if (shouldChasePlayer) {
        targetPlayer.expireBuff("stealth");
        this.state.bubbleMessage = this.state.isAiming ? "0xFFAAAA!" : "?";
        if (shouldStop) {
          return this.standStill();
        }
        if (this.isNearCollideTile()) {
          return this.moveTowardPointPathed(targetPlayer);
        } else {
          return this.moveTowardPoint(targetPlayer);
        }
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
    const changeDirectionDelay = 9; // Number of iterations before changing direction
    const walkSpeed = this.stats.walkSpeed / 2.5;

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
  doHit(ids: Array<string>, abilitySlot: number, attackSpellName: string): void {
    const { scene, room } = this ?? {};
    const roomName: string = room?.name;
    const players: Array<ServerPlayer> = room?.playerManager?.getPlayers();
    const abilityName = this?.abilities?.[abilitySlot]?.base || attackSpellName; // spellName is used for "attack_melee" and "attack_ranged"
    const allowedTargets = spellDetails?.[abilityName]?.allowedTargets;
    const targetIsInParty = false;

    let hitList: Array<Hit> = [];

    /* TODO: verify location of hit before we consider it a hit */

    for (const player of players) {
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
      const newHits = this.calculateDamage(player, abilitySlot, attackSpellName);

      if (newHits?.length > 0) hitList = [...hitList, ...newHits];
    }

    // npcs so far can only target themselves with spells.
    if (allowedTargets?.includes("self") && ids?.includes(this.id)) {
      const newHits = this.calculateDamage(this, abilitySlot, attackSpellName);
      if (newHits?.length > 0) hitList = [...hitList, ...newHits];
    }

    scene.io.to(roomName).emit("assignDamage", hitList);
  }
  dropLoot(magicFind: number) {
    let runners = [];
    /* I.E: A monster of lvl 8 will drop ilvl 2 items
            A monster of lvl 16 will drop ilvl 3 items
    */
    const ilvl = 1 + Math.floor(this.stats.level / ILVL_MULTIPLIER);

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

function calculateNpcAggroRange(npc, AGGRO_KITE_RANGE) {
  return Math.min(10 + npc?.baseStats?.level * 8, AGGRO_KITE_RANGE);
}

function calculateStealthAggroRange({
  nearestPlayer,
  npc,
  npcAggroRange,
  stealthBuff,
}: {
  nearestPlayer: ServerPlayer;
  npc: Npc;
  npcAggroRange: integer;
  stealthBuff: Buff;
}) {
  const newNpcAggroRange =
    npcAggroRange *
    calculateStealthVisibilityPercent({
      distance: distanceTo(nearestPlayer, npc),
      observer: npc,
      player: nearestPlayer,
      stealthBuff,
      maxVisibilityRange: npcAggroRange,
    });
  return newNpcAggroRange;
}

export default Npc;
