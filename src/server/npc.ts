import { ServerCharacter as Character } from "./character";
import { createSpell } from "./spell-adapter";
import { buildNpcBehaviorInput } from "./npc-behavior-adapter";
import { buildEquipment, buildShop } from "./npc-build";
import {
  checkInRange,
  decideNpcAction,
  decideTalkingEnded,
  shouldRespawn,
  type NpcAction,
  type NpcDecision,
} from "@/shared/rules/npc-behavior";
import { canHitPlayer } from "@/shared/rules/spells";
import { entitiesInRoom, getCharacterDirection } from "@/shared/rules/world";
import { findNextWaypoint, isSolidTile, worldToTileX, worldToTileY } from "@/shared/rules/movement";

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

/**
 * An NPC. What it does each tick is decided by `rules/npc-behavior`; this class builds the input
 * for it and carries out the answer with the movement and socket code.
 */
export class Npc extends Character implements Npc {
  public respawnTime: number;
  public drops: Array<Drop>;
  public talkingIds: Array<string>;
  public keeperData: KeeperData;
  declare name: string;
  constructor(
    world: ServerWorld,
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
    },
  ) {
    super(world, args);

    this.name = args?.name;
    this.world = world;
    this.respawnTime = 10000;
    this.drops = args?.drops;
    this.equipment = buildEquipment(equipment);
    this.abilities = buildEquipment(abilities);
    this.talkingIds = [];
    this.keeperData = {
      ...keeperData,
      shop: buildShop(keeperData?.shop),
      quests: keeperData?.quests?.map((questId: string) => world?.quests?.[questId]),
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
  }
  tryRespawn() {
    if (!this.state.isDead) return;
    if (
      shouldRespawn({
        deadTime: this.state.deadTime,
        respawnTime: this.respawnTime,
        now: Date.now(),
      })
    ) {
      this.x = this.startingCoords.x;
      this.y = this.startingCoords.y;
      this.calculateStats(true);
      this.state.isDead = false;
      this.world.io.to(this.room.name).emit("respawnNpc", {
        id: this?.id,
        x: this.x,
        y: this.y,
        respawnTime: Date.now(),
      });
    }
  }
  checkInRange(target: any, range: number) {
    return checkInRange(this, target, range);
  }
  // is the NPC adjacent to a collision tile?
  isNearCollideTile() {
    const { grid } = this.room.map;
    const npcTileX = worldToTileX(grid, this.x);
    const npcTileY = worldToTileY(grid, this.y);

    // All neighboring tiles, including diagonals
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (isSolidTile(grid, npcTileX + dx, npcTileY + dy)) return true;
      }
    }
    return false;
  }
  isOutOfBounds() {
    const { map } = this.room;
    const npcTileX = worldToTileX(map.grid, this.x);
    const npcTileY = worldToTileY(map.grid, this.y);
    if (
      this.x >= 0 &&
      this.y >= 0 &&
      this.x < map.widthInPixels &&
      this.y < map.heightInPixels &&
      !isSolidTile(map.grid, npcTileX, npcTileY)
    ) {
      return false;
    }
    return true;
  }
  update(time: number, delta: number) {
    // Destructure relevant properties from 'this'
    const { state, room } = this ?? {};

    // skip updates if no one is in the room
    if (!room || entitiesInRoom(this.world.players, room.name).length === 0) {
      this.setLockedPlayerId(null);
      this.vx = 0;
      this.vy = 0;
      this.stats.hp = this.stats.maxHp; //heal to full
      return;
    }

    this.checkIsResting();
    this.expireBuffs();

    // If dead, do not continue update
    if (state?.isDead) return this.tryRespawn();

    // Regenerate health points
    this.doRegen();

    const decision = decideNpcAction(buildNpcBehaviorInput(this, time, delta), Math.random);
    this.applyDecision(decision, delta);
  }
  applyDecision(decision: NpcDecision, delta: number) {
    const { state, world } = this;
    if (state.npcAttackReady !== decision.npcAttackReady) {
      state.npcAttackReady = decision.npcAttackReady;
    }
    if (state.isAttacking !== decision.isAttacking) state.isAttacking = decision.isAttacking;
    if (decision.resetAttackTimer) state.lastAttack = Date.now();
    if (state.lockedPlayerId !== decision.lockedPlayerId) {
      state.lockedPlayerId = decision.lockedPlayerId;
    }
    if (decision.bubbleMessage !== undefined) state.bubbleMessage = decision.bubbleMessage;

    const targetPlayer = world?.players?.[decision.targetPlayerId];
    if (decision.expireStealthOfPlayerId) {
      (world?.players?.[decision.expireStealthOfPlayerId] as any)?.expireBuff("stealth");
    }

    this.performMovement(decision.movement, targetPlayer, delta);
    this.performAction(decision.action, targetPlayer);
  }
  performMovement(movement: NpcDecision["movement"], targetPlayer: ServerPlayer, delta: number) {
    switch (movement.type) {
      case "standStill":
        return this.standStill();
      case "chase":
        return movement.pathed
          ? this.moveTowardPointPathed(targetPlayer)
          : this.moveTowardPoint(targetPlayer);
      case "returnToSpawn":
        return movement.pathed
          ? this.moveTowardPointPathed(this.startingCoords)
          : this.moveTowardPoint(this.startingCoords);
      case "waitAtSpawn":
        setTimeout(() => {
          this.direction = "down";
        }, movement.faceDownAfterMs);
        return this.standStill();
      case "talk":
        return this.checkTalking();
      case "wander": {
        const { type: _type, ...change } = movement;
        Object.assign(this, change);
        return;
      }
    }
  }
  performAction(action: NpcAction, targetPlayer: ServerPlayer) {
    if (action.type === "attack") this.intendAttack(action, targetPlayer);
    if (action.type === "cast") this.intendCastSpell(action, targetPlayer);
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

    const { world, room, id } = this ?? {};
    const spellName = ability?.base;

    this.dispelBuffsByProperty("dispelBeforeAttack");

    if (room)
      createSpell(room, {
        caster: this,
        target: targetPlayer,
        spellName,
        castAngle,
        ilvl: ability?.ilvl,
        abilitySlot,
      });

    world.io.to(room?.name).emit("npcCastSpell", { id, castAngle, abilitySlot });
  }
  async intendCastSpell(action: Extract<NpcAction, { type: "cast" }>, targetPlayer: ServerPlayer) {
    const { ability, abilitySlot } = action;
    this.state.isAiming = true;
    await sleep(action.windupMs);
    const castAngle = targetPlayer
      ? Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x)
      : 0;
    this.doCast({ targetPlayer, abilitySlot, ability, castAngle });
    this.state.isAiming = false;
  }
  doAttack({ target, direction, castAngle }) {
    const { world, room, id, state } = this ?? {};
    const targetPlayer = world?.players?.[state?.lockedPlayerId] ?? null;
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

    this.dispelBuffsByProperty("dispelBeforeAttack");

    if (room)
      createSpell(room, {
        caster: this,
        target,
        spellName,
        direction,
        action,
        castAngle,
        ilvl: 1,
      });

    world.io.to(room?.name).emit("npcAttack", { id, count, direction, castAngle });
  }
  async intendAttack(action: Extract<NpcAction, { type: "attack" }>, targetPlayer: ServerPlayer) {
    this.direction = action.direction;
    this.state.isAiming = true;

    let castAngle = (this.state.lastAngle = action.castAngle);
    const direction = `${this.direction}`;
    const target = {
      id: targetPlayer.id,
      x: targetPlayer.x,
      y: targetPlayer.y,
    };

    await sleep(action.windupMs);

    if (this.hasRangedWeapon()) {
      castAngle = Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x);
    }

    this.doAttack({ target, direction, castAngle });
    this.state.isAiming = false;
  }
  moveTowardPoint(coords: Coordinate) {
    const walkSpeed = this.stats.walkSpeed;
    const angle = Math.atan2(coords.y - this.y, coords.x - this.x);
    this.vx = walkSpeed * Math.cos(angle);
    this.vy = walkSpeed * Math.sin(angle);
    this.direction = getCharacterDirection(this, { x: this?.x + this.vx, y: this.y + this.vy });
  }
  moveTowardPointPathed(targetCoords: Coordinate) {
    const { nextPath } = this ?? {};
    this.findPath(targetCoords);
    if (nextPath) {
      this.moveTowardPoint(nextPath);
      if (this.checkInRange(nextPath, 1)) {
        this.nextPath = null;
      }
    }
  }
  /** Looks up the next tile on the way to the target. Walked towards on the following tick. */
  findPath(targetCoords: Coordinate) {
    const next = findNextWaypoint(this.room.pathfinder, this, targetCoords);
    if (JSON.stringify(next) !== JSON.stringify(this.nextPath)) this.nextPath = next;
  }
  standStill() {
    this.vy = 0;
    this.vx = 0;
  }
  checkTalking() {
    const world = this.world;
    this.vy = 0;
    this.vx = 0;

    const ended = decideTalkingEnded(this, this.talkingIds, (id) => world?.players?.[id]);
    for (const playerId of ended) {
      const index = this.talkingIds.indexOf(playerId);
      if (index !== -1) this.talkingIds.splice(index, 1);
    }
  }
  doHit(ids: Array<string>, abilitySlot: number): void {
    const { world, room } = this ?? {};
    const roomName: string = room?.name;
    const players = entitiesInRoom(this.world.players, roomName);
    const { allowedTargets } = this.getAbilityDetails(abilitySlot);

    let hitList: Array<Hit> = [];

    /* TODO: verify location of hit before we consider it a hit */

    for (const player of players) {
      if (!ids?.includes(player.id)) continue;
      // only allow spells to hit intended targets (npcs have no party)
      if (!canHitPlayer({ allowedTargets, isSelf: player.id === this.id, isPartyMember: false })) {
        continue;
      }
      const newHits = this.calculateDamage(player, abilitySlot);

      if (newHits?.length > 0) hitList = [...hitList, ...newHits];
    }

    // npcs so far can only target themselves with spells.
    if (allowedTargets?.includes("self") && ids?.includes(this.id)) {
      const newHits = this.calculateDamage(this, abilitySlot);
      if (newHits?.length > 0) hitList = [...hitList, ...newHits];
    }

    world.io.to(roomName).emit("assignDamage", hitList);
  }
}
