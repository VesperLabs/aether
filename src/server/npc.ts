import type { AbilitySlot } from "@/rules/spells";
import { ServerCharacter as Character, type CharacterArgs } from "./character";
import type { ServerWorld } from "./server-world";
import type { Player } from "./player";
import type { Point, RoomData } from "@/rules/world";
import { createSpell } from "./spell-adapter";
import { buildNpcBehaviorInput } from "./npc-behavior-adapter";
import { buildEquipment, buildShop, type ItemRecipe } from "./npc-build";
import {
  checkInRange,
  decideNpcAction,
  decideTalkingEnded,
  separate,
  shouldRespawn,
  seek,
  steerWithSeparation,
  type NpcAction,
  type NpcAbility,
  type NpcDecision,
} from "@/rules/npc-behavior";
import { canHitPlayer } from "@/rules/spells";
import {
  createRng,
  createTimers,
  entitiesInRoom,
  getCharacterDirection,
  seedFromString,
  type Rng,
} from "@/rules/world";
import { getRoomIndex } from "./room-index";

/** NPCs closer than this push apart while walking, so packs spread out instead of stacking. */
const NPC_SEPARATION_RADIUS = 20;
/** How hard that push steers, as a share of walk speed. */
const NPC_SEPARATION_STRENGTH = 0.6;
import { findNextWaypoint, isNextToSolidTile, isOutOfMap } from "@/rules/movement";

/** An NPC as the content tables define it, before it is placed in a world. */
// Legacy: the keeper and nasty tables have different shapes; type them once they share a base.
// oxlint-disable-next-line typescript/no-explicit-any
export type NpcDefinition = Record<string, any>;

/** What an NPC is created from: a content definition placed in a room. */
type NpcArgs = CharacterArgs & {
  name: string;
  equipment?: Record<string, ItemRecipe>;
  abilities?: Record<string, ItemRecipe>;
  keeperData?: KeeperData;
  drops?: Array<Drop>;
  hitBoxSize?: { width: number; height: number };
};

/** What an NPC needs to cast a spell. */
interface NpcCastRequest {
  ability: NpcAbility & { ilvl?: number };
  abilitySlot: AbilitySlot;
  targetPlayer?: Player;
  castAngle: number;
}

/** What an NPC needs to attack. */
interface NpcAttackRequest {
  target: { id: string; x: number; y: number };
  direction: string;
  castAngle: number;
}

/**
 * An NPC. What it does each tick is decided by `rules/npc-behavior`; this class builds the input
 * for it and carries out the answer with the movement and socket code.
 */
export class Npc extends Character {
  public respawnTime: number;
  public drops: Array<Drop>;
  public talkingIds: Array<string>;
  public keeperData: KeeperData;
  /** Windups and waits, run from `update` so they stop with the world. */
  public timers = createTimers();
  /** Seeded from the id, so a replayed world rolls the same wanders and buff casts. */
  public rng: Rng;
  declare name: string;
  /** NPCs never leave their room, so unlike players these are always set. */
  declare room: RoomData;
  declare roomName: string;
  constructor(
    world: ServerWorld,
    { equipment = {}, abilities = {}, keeperData = {}, ...args }: NpcArgs,
  ) {
    super(world, args);

    this.name = args?.name;
    this.world = world;
    this.respawnTime = 10000;
    /* Keepers have no drops in their content. */
    this.drops = args?.drops as Array<Drop>;
    this.equipment = buildEquipment(equipment);
    this.abilities = buildEquipment(abilities);
    this.talkingIds = [];
    this.keeperData = {
      ...keeperData,
      shop: buildShop(keeperData?.shop),
      quests: keeperData?.quests?.map((questId: string) => world?.quests?.[questId]),
    };
    this.rng = createRng(seedFromString(String(this.id ?? this.name)));
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
      this.world.events.emit("npcRespawned", {
        npcId: this.id,
        roomName: this.room.name,
        x: this.x,
        y: this.y,
        at: Date.now(),
      });
    }
  }
  checkInRange(target: Point, range: number) {
    return checkInRange(this, target, range);
  }
  isNearCollideTile() {
    return isNextToSolidTile(this.room.map.grid, this.x, this.y);
  }
  isOutOfBounds() {
    return isOutOfMap(this.room.map, this.x, this.y);
  }
  update(time: number, delta: number, now = Date.now()) {
    const { state, room } = this ?? {};
    this.timers.advance(delta);

    // skip updates if no one is in the room
    if (!room || getRoomIndex(this.world, room.name).players.size === 0) {
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

    const decision = decideNpcAction(buildNpcBehaviorInput(this, { time, delta, now }), this.rng);
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

    const targetPlayer = world?.players?.[decision.targetPlayerId ?? ""];
    if (decision.expireStealthOfPlayerId) {
      world?.players?.[decision.expireStealthOfPlayerId]?.expireBuff("stealth");
    }

    this.performMovement(decision.movement, targetPlayer, delta);
    this.performAction(decision.action, targetPlayer);
  }
  performMovement(movement: NpcDecision["movement"], targetPlayer: Player, delta: number) {
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
        this.timers.after(movement.faceDownAfterMs, () => {
          this.direction = "down";
        });
        return this.standStill();
      case "talk":
        return this.checkTalking();
      case "wander": {
        const { type: _type, nextWanderAt, ...change } = movement;
        if (nextWanderAt !== undefined) this.state.nextWanderAt = nextWanderAt;
        Object.assign(this, change);
        return;
      }
    }
  }
  performAction(action: NpcAction, targetPlayer: Player) {
    if (action.type === "attack") this.intendAttack(action, targetPlayer);
    if (action.type === "cast") this.intendCastSpell(action, targetPlayer);
  }
  setLockedPlayerId(id: string | null | undefined) {
    // If they are switching targets
    if (this.state.lockedPlayerId !== id && id) {
      this.state.lastAttack = Date.now();
      this.state.npcAttackReady = false;
    }
    this.state.lockedPlayerId = id;
  }
  doCast({ ability, abilitySlot, targetPlayer, castAngle }: NpcCastRequest) {
    /* Slot keys are numeric strings at runtime; the model types them as numbers. */
    if (!this.canCastSpell(abilitySlot)) return;

    const { world, room, id } = this ?? {};
    const spellName = ability?.base as string;
    const slot = abilitySlot;

    this.dispelBuffsByProperty("dispelBeforeAttack");

    if (room)
      createSpell(room, {
        caster: this,
        target: targetPlayer,
        spellName,
        castAngle,
        ilvl: ability?.ilvl,
        abilitySlot: slot,
      });

    world.events.emit("npcCast", { npcId: id, roomName: room.name, abilitySlot, castAngle });
  }
  intendCastSpell(action: Extract<NpcAction, { type: "cast" }>, targetPlayer: Player) {
    const { ability, abilitySlot } = action;
    this.state.isAiming = true;
    this.timers.after(action.windupMs, () => {
      const castAngle = targetPlayer
        ? Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x)
        : 0;
      this.doCast({ targetPlayer, abilitySlot, ability, castAngle });
      this.state.isAiming = false;
    });
  }
  doAttack({ target, direction, castAngle }: NpcAttackRequest) {
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

    world.events.emit("npcAttacked", {
      npcId: id,
      roomName: room.name,
      count,
      direction,
      castAngle,
    });
  }
  intendAttack(action: Extract<NpcAction, { type: "attack" }>, targetPlayer: Player) {
    this.direction = action.direction;
    this.state.isAiming = true;

    let castAngle = (this.state.lastAngle = action.castAngle);
    const direction = `${this.direction}`;
    const target = {
      id: targetPlayer.id,
      x: targetPlayer.x,
      y: targetPlayer.y,
    };

    this.timers.after(action.windupMs, () => {
      if (this.hasRangedWeapon()) {
        castAngle = Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x);
      }
      this.doAttack({ target, direction, castAngle });
      this.state.isAiming = false;
    });
  }
  moveTowardPoint(coords: Coordinate) {
    const walkSpeed = this.stats.walkSpeed;
    const neighbors = getRoomIndex(this.world, this.room.name).npcs.near(
      this,
      NPC_SEPARATION_RADIUS,
    );
    const { vx, vy } = steerWithSeparation(
      seek(this, coords, walkSpeed),
      separate(this, neighbors, NPC_SEPARATION_RADIUS),
      walkSpeed * NPC_SEPARATION_STRENGTH,
    );
    this.vx = vx;
    this.vy = vy;
    this.direction = getCharacterDirection(this, { x: this?.x + this.vx, y: this.y + this.vy });
  }
  moveTowardPointPathed(targetCoords: Coordinate) {
    const { nextPath } = this ?? {};
    this.findPath(targetCoords);
    if (nextPath) {
      this.moveTowardPoint(nextPath);
      if (this.checkInRange(nextPath, 1)) {
        /* Cleared with null; the shared model types it as always set. */
        this.nextPath = null as unknown as Point;
      }
    }
  }
  /** Looks up the next tile on the way to the target. Walked towards on the following tick. */
  findPath(targetCoords: Coordinate) {
    const next = findNextWaypoint(this.room.pathfinder, this, targetCoords);
    const current = this.nextPath;
    if (next?.x !== current?.x || next?.y !== current?.y) this.nextPath = next as Point;
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
  doHit(ids: Array<string>, abilitySlot?: AbilitySlot): void {
    const { world, room } = this ?? {};
    const roomName = room.name;
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
