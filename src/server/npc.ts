import type { BotPersonalityId, MobBehavior } from "@/content";
import type { AbilitySlot } from "@/rules/spells";
import type { Hand } from "@/rules/combat";
import {
  ServerCharacter as Character,
  type CharacterArgs,
  type ServerCharacter,
} from "./character";
import type { ServerWorld } from "./server-world";
import type { Player } from "./player";
import { findCharacter } from "./find-character";
import { applyNpcHits } from "./npc-hits";
import { findLeader, homeOf } from "./npc-leader";
import { createMind, runMind, type NpcMind } from "./npc-mind";
import { isAlly } from "./allegiance-adapter";
import type { Point, RoomData } from "@/rules/world";
import { createSpell } from "./spell-adapter";
import { buildNpcBehaviorInput } from "./npc-behavior-adapter";
import { buildEquipment, buildShop, type ItemRecipe, type ShopEntry } from "./npc-build";
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
import { aimNpcShot } from "@/rules/npc-behavior";
import {
  createRng,
  createTimers,
  getCharacterDirection,
  seedFromString,
  type Rng,
} from "@/rules/world";
import { isRoomWatched } from "./room-index";
import { afterWindup, cancelWindup, emitNpcWindup, type WindupTrack } from "./npc-windup";
import { isNextToSolidTile, isOutOfMap } from "@/rules/movement";

/** An actor as content defines it, before it is placed in a world. */
// Legacy: `NpcArgs` mixes content with placement; type this as `ActorDefinition` once they split.
// oxlint-disable-next-line typescript/no-explicit-any
export type NpcDefinition = Record<string, any>;

/** What an NPC is created from: a content definition placed in a room. */
type NpcArgs = CharacterArgs & {
  name: string;
  equipment?: Record<string, ItemRecipe>;
  abilities?: Record<string, ItemRecipe>;
  dialogues?: NpcServices["dialogues"];
  shop?: Array<ShopEntry>;
  quests?: readonly string[];
  home?: Coordinate;
  drops?: Array<Drop>;
  hitBoxSize?: { width: number; height: number };
  behaviors?: readonly MobBehavior[];
  mind?: BotPersonalityId;
  windupMs?: number;
};

/** What an NPC needs to cast a spell. */
interface NpcCastRequest {
  ability: NpcAbility & { ilvl?: number };
  abilitySlot: AbilitySlot;
  targetPlayer?: ServerCharacter;
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
  public services: NpcServices;
  /** Players can talk to it: it has `dialogues`. */
  public talks: boolean;
  /** Windups and waits, run from `update` so they stop with the world. */
  public timers = createTimers();
  /** Seeded from the id, so a replayed world rolls the same wanders and buff casts. */
  public rng: Rng;
  /** Threat by player socket id; the top player is who it fights. */
  public threat: ThreatTable = {};
  public windup: WindupTrack = { seq: 0 };
  /** From content; unset means the default behaviors and warning delay. */
  public behaviors?: readonly MobBehavior[];
  public windupMs?: number;
  /** A planning brain that runs instead of `behaviors`, from the actor's `mind` part. */
  public mind?: NpcMind;
  /** Content name of the NPC it follows, from a `leader` map property. */
  public leaderName?: string;
  declare name: string;
  /** NPCs never leave their room, so unlike players these are always set. */
  declare room: RoomData;
  declare roomName: string;
  constructor(
    world: ServerWorld,
    { equipment = {}, abilities = {}, dialogues, shop, quests, home, ...args }: NpcArgs,
  ) {
    super(world, args);

    this.name = args?.name;
    this.world = world;
    this.respawnTime = 10000;
    /* Actors without a `drops` part drop nothing of their own. */
    this.drops = args?.drops as Array<Drop>;
    this.equipment = buildEquipment(world.dice, equipment);
    this.abilities = buildEquipment(world.dice, abilities);
    this.talkingIds = [];
    /* What players get when they talk to it; empty for actors without those parts. */
    this.services = {
      dialogues,
      shop: buildShop(world.dice, shop),
      quests: quests?.map((questId) => world?.quests?.[questId]),
      home,
    };
    this.talks = !!dialogues;
    this.rng = createRng(seedFromString(String(this.id ?? this.name)));
    /* Followers are picked per spawn: a `leader` map property makes this one follow. */
    this.leaderName = (this.state as { leader?: string }).leader;
    this.behaviors = this.leaderName ? [...(args.behaviors ?? []), "follow"] : args.behaviors;
    this.windupMs = args.windupMs;
    if (args.mind) this.mind = createMind(this, args.mind);
    this.calculateStats(true);
  }
  addThreat(playerSocketId: string, amount: number) {
    if (this.state.isDead || this.state.isResetting) return;
    this.threat = addThreat(this.threat, playerSocketId, amount);
  }
  threatTargetId() {
    return pickThreatTarget(this.threat, this.state.lockedPlayerId);
  }
  /** The player this companion belongs to, if it has one and they are still here. */
  owner(): Player | undefined {
    const { ownerId } = this.state;
    return ownerId ? this.world.players[ownerId] : undefined;
  }
  /** Who it follows: its owner, or its pack leader. */
  findLeader(): Point | null {
    return findLeader(this);
  }
  /** Where it leashes to and walks back to. */
  home(): Point {
    return homeOf(this);
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
      const { x, y } = this.home();
      this.x = x;
      this.y = y;
      this.calculateStats(true);
      this.state.isDead = false;
      this.state.retreatAt = undefined;
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

    // skip updates if no one is in the room, playing or observing
    if (!room || !isRoomWatched(this.world, room.name)) {
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

    // Regenerate health points, except while running away hurt
    if (state.behavior !== "retreat") this.doRegen();

    this.threat = decayThreat(
      pruneThreat(this.threat, (id) => {
        const foe = findCharacter(this.world, id);
        return (
          foe?.room?.name === room.name && !foe.state?.isDead && !isAlly(this.world, this, foe)
        );
      }),
      delta,
    );

    if (this.mind) return runMind(this, this.mind);
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

    const targetPlayer = findCharacter(world, decision.targetPlayerId);
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
      state.retreatAt = undefined;
      this.stats.hp = this.stats.maxHp;
    }

    if (decision.cancelWindup) cancelWindup(this);
    performNpcMovement(this, decision.movement, targetPlayer, this.findLeader());
    // Winding up a shot or spell: keep facing the target even if movement turned it away
    if (this.state.isAiming && targetPlayer) this.faceTarget(targetPlayer);
    this.performAction(decision.action, targetPlayer);
  }
  performAction(action: NpcAction, targetPlayer: ServerCharacter | undefined) {
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
  intendCastSpell(
    action: Extract<NpcAction, { type: "cast" }>,
    targetPlayer: ServerCharacter | undefined,
  ) {
    const { ability, abilitySlot } = action;
    this.state.isAiming = true;
    if (targetPlayer) this.faceTarget(targetPlayer);
    emitNpcWindup(this, action, targetPlayer?.id);
    afterWindup(this, action.windupMs, targetPlayer?.id, () => {
      if (targetPlayer) this.faceTarget(targetPlayer);
      const castAngle = targetPlayer ? aimNpcShot(this, targetPlayer, ability.base as string) : 0;
      this.doCast({ targetPlayer, abilitySlot, ability, castAngle });
      this.state.isAiming = false;
    });
  }
  doAttack({ target, direction, castAngle: aimedAngle }: NpcAttackRequest) {
    let castAngle = aimedAngle;
    const { world, room, id, state } = this ?? {};
    const targetPlayer = findCharacter(world, state?.lockedPlayerId) ?? null;
    if (state.isAttacking || state?.isDead) return;
    if (!targetPlayer || targetPlayer?.state?.isDead) return;

    // decides what hand ot hit with
    const count = this.action === "attack_right" && this.hasWeaponLeft() ? 2 : 1;
    // Set state to attacking and record attack time
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
      });

    world.events.emit("npcAttacked", {
      npcId: id,
      roomName: room.name,
      count,
      direction,
      castAngle,
    });
  }
  intendAttack(
    action: Extract<NpcAction, { type: "attack" }>,
    targetPlayer: ServerCharacter | undefined,
  ) {
    if (!targetPlayer) return;
    this.direction = action.direction;
    this.state.isAiming = true;

    this.state.lastAngle = action.castAngle;

    emitNpcWindup(this, action, targetPlayer.id);
    // Swings and shots land toward where the target is now, so circling it doesn't leave it facing off
    afterWindup(this, action.windupMs, targetPlayer.id, () => {
      this.faceTarget(targetPlayer);
      const target = { id: targetPlayer.id, x: targetPlayer.x, y: targetPlayer.y };
      const castAngle = Math.atan2(target.y - this.y, target.x - this.x);
      this.doAttack({ target, direction: `${this.direction}`, castAngle });
      this.state.isAiming = false;
    });
  }
  doHit(ids: Array<string>, abilitySlot?: AbilitySlot, hand?: Hand): void {
    applyNpcHits(this, ids, abilitySlot, hand);
  }
}
