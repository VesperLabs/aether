import type { MobAttackStyle, MobBehavior, NastyDefinition } from "@/content";
import type { AbilitySlot } from "@/rules/spells";
import { ServerCharacter as Character, type CharacterArgs } from "./character";
import type { ServerWorld } from "./server-world";
import type { Player } from "./player";
import type { Point, RoomData } from "@/rules/world";
import { createSpell } from "./spell-adapter";
import { buildNpcBehaviorInput } from "./npc-behavior-adapter";
import { buildEquipment, buildShop, type ItemRecipe } from "./npc-build";
import {
  addThreat,
  checkInRange,
  decayThreat,
  decideNpcAction,
  pickThreatTarget,
  pruneThreat,
  shouldRespawn,
  type NpcAction,
  type NpcAbility,
  type NpcDecision,
  type ThreatTable,
} from "@/rules/npc-behavior";
import { performNpcMovement } from "./npc-movement";
import { canHitPlayer } from "@/rules/spells";
import { aimNpcShot } from "@/rules/npc-behavior";
import {
  createRng,
  createTimers,
  entitiesInRoom,
  getCharacterDirection,
  seedFromString,
  type Rng,
} from "@/rules/world";
import { getRoomIndex } from "./room-index";
import { emitNpcWindup, startNpcLunge } from "./npc-attack";
import { isNextToSolidTile, isOutOfMap } from "@/rules/movement";

/** How far a follower looks for its leader. Spawns are up to ~900px apart on the peaks. */
const LEADER_SEARCH_RADIUS = 1000;

/** An NPC as the content tables define it, before it is placed in a world. */
// Legacy: the keeper and nasty tables have different shapes; type them once they share a base.
// oxlint-disable-next-line typescript/no-explicit-any
export type NpcDefinition = Record<string, any>;

/** What an NPC is created from: a content definition placed in a room. */
type NpcArgs = CharacterArgs &
  Pick<NastyDefinition, "windupMs" | "attackStyle"> & {
    name: string;
    equipment?: Record<string, ItemRecipe>;
    abilities?: Record<string, ItemRecipe>;
    keeperData?: KeeperData;
    drops?: Array<Drop>;
    hitBoxSize?: { width: number; height: number };
    behaviors?: readonly MobBehavior[];
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
  /** Threat by player socket id; the top player is who it fights. */
  public threat: ThreatTable = {};
  /** From content; unset means the default behaviors and warning delay. */
  public behaviors?: readonly MobBehavior[];
  public windupMs?: number;
  public attackStyle?: MobAttackStyle;
  /** Content name of the NPC it follows, from a `leader` map property. */
  public leaderName?: string;
  /** The leader's spawn, remembered once found so the pack keeps its home if the leader dies. */
  public leaderHome?: Point;
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
    /* Followers are picked per spawn: a `leader` map property makes this one follow. */
    this.leaderName = (this.state as { leader?: string }).leader;
    this.behaviors = this.leaderName ? [...(args.behaviors ?? []), "follow"] : args.behaviors;
    ({ windupMs: this.windupMs, attackStyle: this.attackStyle } = args);
    this.calculateStats(true);
  }
  addThreat(playerSocketId: string, amount: number) {
    if (this.state.isDead || this.state.isResetting) return;
    this.threat = addThreat(this.threat, playerSocketId, amount);
  }
  threatTargetId() {
    return pickThreatTarget(this.threat, this.state.lockedPlayerId);
  }
  /** The nearest living NPC named `leaderName` in this room, if any. */
  findLeader() {
    if (!this.leaderName) return null;
    const npcs = getRoomIndex(this.world, this.room.name).npcs.near(this, LEADER_SEARCH_RADIUS);
    let leader: Npc | null = null;
    let best = Infinity;
    for (const npc of npcs) {
      if (npc === this || npc.name !== this.leaderName) continue;
      const distance = Math.hypot(npc.x - this.x, npc.y - this.y);
      if (distance < best) [leader, best] = [npc, distance];
    }
    if (leader) this.leaderHome = leader.startingCoords;
    return leader;
  }
  /** Where it leashes to and walks back to. */
  home(): Point {
    return this.leaderHome ?? this.startingCoords;
  }
  setDead() {
    this.expireBuffs(true);
    this.threat = {};
    this.state.isDead = true;
    this.state.deadTime = this.world.now();
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
        now: this.world.now(),
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
        at: this.world.now(),
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
  update(time: number, delta: number, now = this.world.now()) {
    const { state, room } = this ?? {};
    this.timers.advance(delta);

    // skip updates if no one is in the room
    if (!room || getRoomIndex(this.world, room.name).players.size === 0) {
      this.setLockedPlayerId(null);
      this.threat = {};
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

    this.threat = decayThreat(
      pruneThreat(this.threat, (id) => {
        const player = this.world.players[id];
        return player?.room?.name === room.name && !player.state?.isDead;
      }),
      delta,
    );

    const decision = decideNpcAction(buildNpcBehaviorInput(this, { time, delta, now }), this.rng);
    this.applyDecision(decision);
  }
  applyDecision(decision: NpcDecision) {
    const { state, world } = this;
    if (state.npcAttackReady !== decision.npcAttackReady) {
      state.npcAttackReady = decision.npcAttackReady;
    }
    if (state.isAttacking !== decision.isAttacking) state.isAttacking = decision.isAttacking;
    if (decision.resetAttackTimer) state.lastAttack = this.world.now();
    if (state.lockedPlayerId !== decision.lockedPlayerId) {
      state.lockedPlayerId = decision.lockedPlayerId;
    }
    if (decision.bubbleMessage !== undefined) state.bubbleMessage = decision.bubbleMessage;

    const targetPlayer = world?.players?.[decision.targetPlayerId ?? ""];
    if (decision.expireStealthOfPlayerId) {
      world?.players?.[decision.expireStealthOfPlayerId]?.expireBuff("stealth");
    }

    if (decision.behavior !== state.behavior) state.behavior = decision.behavior;
    if (decision.startReset) {
      state.isResetting = true;
      this.threat = {};
    }
    if (decision.finishReset) {
      state.isResetting = false;
      this.stats.hp = this.stats.maxHp;
    }

    performNpcMovement(this, decision.movement, targetPlayer, this.findLeader());
    // Winding up a shot or spell: keep facing the target even if movement turned it away
    if (this.state.isAiming && targetPlayer) this.faceTarget(targetPlayer);
    this.performAction(decision.action, targetPlayer);
  }
  performAction(action: NpcAction, targetPlayer: Player) {
    if (action.type === "attack") this.intendAttack(action, targetPlayer);
    if (action.type === "cast") this.intendCastSpell(action, targetPlayer);
  }
  faceTarget(target: Point) {
    this.direction = getCharacterDirection(this, target);
  }
  setLockedPlayerId(id: string | null | undefined) {
    // If they are switching targets
    if (this.state.lockedPlayerId !== id && id) {
      this.state.lastAttack = this.world.now();
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
    if (targetPlayer) this.faceTarget(targetPlayer);
    emitNpcWindup(this, action, targetPlayer?.id);
    this.timers.after(action.windupMs, () => {
      if (targetPlayer) this.faceTarget(targetPlayer);
      const castAngle = targetPlayer ? aimNpcShot(this, targetPlayer, ability.base as string) : 0;
      this.doCast({ targetPlayer, abilitySlot, ability, castAngle });
      this.state.isAiming = false;
    });
  }
  doAttack({ target, direction, castAngle: aimedAngle }: NpcAttackRequest) {
    let castAngle = aimedAngle;
    const { world, room, id, state } = this ?? {};
    const targetPlayer = world?.players?.[state?.lockedPlayerId] ?? null;
    if (state.isAttacking || state?.isDead) return;
    if (!targetPlayer || targetPlayer?.state?.isDead) return;

    const count = this.action === "attack_right" && this.hasWeaponLeft() ? 2 : 1;
    this.state.isAttacking = true;
    this.state.lastAttack = this.world.now();
    this.state.npcAttackReady = false;

    if (this?.hasBuff("stun")) return;

    /* Switch hands if possible */
    const { spellName, action } = this.getAttackActionName({ count });
    this.action = action;
    // Ranged shots aim from where they spawn, at where the target is now
    if (this.hasRangedWeapon()) castAngle = aimNpcShot(this, targetPlayer, spellName);

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
        ...startNpcLunge(this, target),
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

    const castAngle = (this.state.lastAngle = action.castAngle);
    let direction = `${this.direction}`;
    const target = {
      id: targetPlayer.id,
      x: targetPlayer.x,
      y: targetPlayer.y,
    };

    emitNpcWindup(this, action, targetPlayer.id);
    this.timers.after(action.windupMs, () => {
      if (this.hasRangedWeapon()) {
        this.faceTarget(targetPlayer);
        direction = `${this.direction}`;
      }
      this.doAttack({ target, direction, castAngle });
      this.state.isAiming = false;
    });
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
