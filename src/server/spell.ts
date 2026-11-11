import type { AbilitySlot } from "@/rules/spells";
import type { ServerWorld } from "./server-world";
import { distanceTo } from "@/rules/world";
import { entitiesInRoom } from "@/rules/world";
import { LUNGE_HIT_LEAD, getLungeDuration, type Shape } from "@/rules/movement";
import {
  characterHitBox,
  findSpellHits,
  getMeleeSwing,
  getSpellShape,
  getSwingActiveMs,
  getSwingShape,
  planSwing,
  usesLeftHand,
  usesRightHand,
  type SwingPlan,
  getSpellFlight,
  getSpell,
  isSpellExpired,
  toSpellVictims,
} from "@/rules/spells";
import { findSpell } from "@/content";
import { hasWeapon } from "@/rules/combat";
import { ServerCharacter } from "./character";
import type { EffectSource, SpellEffectWire } from "@/network";

/** Send the shapes behind every hit to the clients, so they can draw what the server saw. */
const DEBUG_HITS = process.env.DEBUG === "true";

/** Who an NPC spell or attack is aimed at. */
export interface SpellTarget {
  id?: string;
  x: number;
  y: number;
}

/** What it takes to start a spell or attack. */
export interface SpellArgs {
  id: string;
  room: Room;
  caster: ServerCharacter;
  direction?: string;
  target?: SpellTarget;
  abilitySlot?: AbilitySlot;
  spellName: string;
  action?: string;
  castAngle?: number;
  rank?: number;
}

/** A spell or attack in flight. Plain data: where it is, how it moves and what it can hit. */
export class Spell implements EffectSource {
  public id: string;
  public x: number;
  public y: number;
  public room: Room;
  public caster: ServerCharacter;
  public target?: SpellTarget;
  public spellName: string;
  public spawnPoint: Coordinate;
  public state: { spawnTime: number; isExpired: boolean };
  public world: ServerWorld;
  public stickToCaster = false;
  /** Velocity in pixels per second. */
  public velocityX = 0;
  public velocityY = 0;
  private targets: readonly string[];
  private maxActiveTime: number | undefined;
  private maxDistance: number;
  private bodySize: number;
  private scale: number;
  /** Set for bursts with a box instead of a circle (quake). */
  private box: { halfWidth: number; halfHeight: number } | null = null;
  private hitIds: Array<string> = [];
  private direction: string;
  private isMeleeAttack: boolean;
  private abilitySlot?: AbilitySlot;
  private action: string;
  private isLunge = false;
  /** A melee swing: the wedge its blade sweeps, from the swinging hand. */
  private swing: SwingPlan | null = null;
  private castAngle: number;
  private rank: number;

  constructor(
    world: ServerWorld,
    {
      id,
      room,
      caster,
      direction,
      target,
      abilitySlot,
      spellName,
      action,
      castAngle = 0,
      rank = 1,
    }: SpellArgs,
  ) {
    this.spawnPoint = { x: caster.x, y: caster.y + caster.bodyCenterY };
    this.x = this.spawnPoint.x;
    this.y = this.spawnPoint.y;
    this.id = id;
    this.world = world;
    this.room = room;
    this.caster = caster;
    this.target = target;
    this.spellName = spellName;
    this.direction = direction ?? caster?.direction;
    this.state = { spawnTime: this.world.now(), isExpired: false };
    this.abilitySlot = abilitySlot;
    this.action = action ?? "attack_right";
    this.castAngle = castAngle;
    this.rank = rank;

    if (!findSpell(spellName)) console.warn(`Unknown spell "${spellName}", swinging instead`);
    const spell = getSpell(spellName);
    const { delivery } = spell;
    const shape = getSpellShape(spell, rank);

    this.isMeleeAttack = delivery.type === "swing";
    this.targets = spell.targets;
    this.maxActiveTime = shape.hitMs;
    this.bodySize = shape.size;
    this.maxDistance = shape.maxDistance;
    this.scale = shape.scale;

    if (this.isMeleeAttack) {
      const swing = getMeleeSwing(
        {
          y: caster.y,
          bodyCenterY: caster.bodyCenterY,
          direction: caster.direction,
          race: caster.profile.race,
        },
        this.action,
        (hand) => caster.getWeaponRange(hand),
      );
      this.y = swing.y;
      this.bodySize = swing.reach ?? this.bodySize;
      const isLeft = usesLeftHand(this.action);
      const isRight = usesRightHand(this.action);
      const hand = isLeft && !isRight ? "handLeft" : "handRight";
      const held = caster.visibleEquipment?.[hand];
      this.swing = planSwing({
        direction: this.direction,
        action: this.action,
        race: caster.profile.race,
        reach: caster.getWeaponRange(hand),
        hasWeaponRange: !!held?.stats?.range,
        isPunching: (isLeft || isRight) && !hasWeapon(caster),
        isUppercut: held?.base === "fist",
        bodyPivotY: swing.y - caster.y,
        visibleMs: shape.visibleMs,
      });
      this.maxActiveTime = getSwingActiveMs(this.swing, this.maxActiveTime);
    }

    const flight = getSpellFlight(spell, castAngle, this.action, (hand) =>
      caster.getWeaponRange(hand),
    );
    if (flight) {
      ({ x: this.velocityX, y: this.velocityY } = flight.velocity);
      this.maxDistance = flight.maxDistance;
    }
    if (delivery.type === "burst" && delivery.shape === "box") {
      this.box = { halfWidth: this.bodySize * 2, halfHeight: this.bodySize };
      this.y = this.caster.y + 6;
    }
    if (delivery.type === "aura") this.stickToCaster = true;
    if (delivery.type === "dash") {
      this.isLunge = true;
      // The hit rides along with the caster, who dashes along the aim (to just past a target)
      this.stickToCaster = true;
      const lungeMs = getLungeDuration(target ? distanceTo(caster, target) : undefined);
      this.maxActiveTime = lungeMs;
      caster.state.lungeAt = world.now();
      caster.state.lungeAngle = castAngle;
      caster.state.lungeMs = lungeMs;
    }
    this.adjustSpellPosition();
    /* TODO: When we add buffs, make sure they do the same as adjustSpellPosition on clientside */
  }
  /**
   * This spell as an effect, for a client walking into the room mid-flight. Only spells flying on
   * their own: swings, buffs and lunges ride their caster and are over in a moment.
   */
  toEffect(now: number): SpellEffectWire | undefined {
    if (this.stickToCaster || this.isMeleeAttack || this.state.isExpired) return undefined;
    return {
      kind: "spell",
      id: this.id,
      ageMs: now - this.state.spawnTime,
      casterId: this.caster.socketId || this.caster.id,
      spellName: this.spellName,
      castAngle: this.castAngle,
      action: this.action,
      rank: this.rank,
      spawnPoint: this.spawnPoint,
    };
  }
  /** The area this spell hits right now. */
  getShape(): Shape | null {
    if (this.swing) {
      return getSwingShape(this.swing, this.caster, this.world.now() - this.state.spawnTime);
    }
    if (this.box) {
      return {
        kind: "box",
        x: this.x,
        y: this.y,
        halfWidth: this.box.halfWidth * this.scale,
        halfHeight: this.box.halfHeight * this.scale,
      };
    }
    const radius = Math.floor(this.bodySize * this.scale);
    return radius > 0 ? { kind: "circle", x: this.x, y: this.y, radius } : null;
  }
  update() {
    this.state.isExpired = isSpellExpired({
      maxDistance: this.maxDistance,
      distanceFromSpawn: distanceTo(this, this.spawnPoint),
      spawnTime: this.state.spawnTime,
      /* Spells without a lifetime never time out (undefined compares false). */
      lifetime: this.maxActiveTime as number,
      now: this.world.now(),
    });

    if (this.state.isExpired) {
      /* Ticks are coarser than the blade: one last check of the whole sweep, so its end counts */
      if (this.swing) this.checkCollisions(true);
      if (!getSpell(this.spellName).vanishes) {
        this.caster?.dispelBuffsByProperty("dispelAfterAttack");
      }
      return;
    }
    this.adjustSpellPosition();
    this.checkCollisions();
  }
  checkCollisions(isFinalSweep = false) {
    if (this?.state?.isExpired && !isFinalSweep) return;
    const { target, caster, world } = this;
    const victims = [
      ...entitiesInRoom(world.npcs, this.room?.name),
      ...entitiesInRoom(world.players, this.room?.name),
    ] as unknown as Array<ServerCharacter>;
    const shape = this.getShape();
    /* A player aimed at where others looked on their screen, which lags the server: judge by that. */
    const rewind = caster?.viewLagMs ?? 0;
    const seenAt = world.now() - rewind;
    const history = this.room?.poseHistory;
    const victimShapes = toSpellVictims(
      victims,
      rewind && history
        ? (id) => (id === caster.id ? undefined : history.positionAt(id, seenAt))
        : undefined,
    );
    const hits = findSpellHits({
      shape,
      victims: victimShapes,
      hitIds: this.hitIds,
      allowedTargets: this.targets,
      caster: { id: caster?.id, x: caster.x, y: caster.y, isPlayer: caster?.kind === "player" },
      targetId: target?.id,
      direction: this.direction,
      isMeleeAttack: this.isMeleeAttack,
    });
    if (hits.length === 0) return;
    this.hitIds = [...new Set([...this.hitIds, ...hits])];
    /* Everyone hit this tick lands together, so their drains add up into one total. Without an
     * ability slot it is an attack, made with the hand that swung. */
    this.caster.doHit(
      hits,
      this.abilitySlot,
      this.action === "attack_left" ? "handLeft" : "handRight",
    );
    for (const id of hits) {
      const victim = victimShapes.find((v) => v.id === id);
      if (DEBUG_HITS && shape && victim) {
        world.events.emit("spellHitShapes", {
          roomName: this.room.name,
          spell: shape,
          victim: characterHitBox(victim),
        });
      }
    }
  }
  adjustSpellPosition() {
    if (this.stickToCaster) {
      this.x = this.caster.x;
      this.y = this.caster.y + this.caster.bodyCenterY;
    }
    if (this.isLunge) {
      const angle = this.caster.state.lungeAngle ?? 0;
      this.x += Math.cos(angle) * LUNGE_HIT_LEAD;
      this.y += Math.sin(angle) * LUNGE_HIT_LEAD;
    }
  }
  getTrimmed() {
    return {
      id: this?.id,
      maxActiveTime: this?.maxActiveTime,
      roomName: this?.room?.name,
      spellName: this?.spellName,
      caster: { id: this?.caster?.id },
      state: this?.state,
      x: this?.x,
      y: this?.y,
    };
  }
}
