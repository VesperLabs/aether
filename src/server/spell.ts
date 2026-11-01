import type { AbilitySlot } from "@/rules/spells";
import type { ServerWorld } from "./server-world";
import { distanceTo } from "@/rules/world";
import { entitiesInRoom } from "@/rules/world";
import { LUNGE_HIT_LEAD, getLungeDuration, type Shape } from "@/rules/movement";
import {
  BUFF_SPELLS,
  characterHitBox,
  findSpellHits,
  getMeleeSwing,
  getSpellShape,
  getSpellFlight,
  isSpellExpired,
  resolveSpellDetails,
} from "@/rules/spells";
import { ServerCharacter } from "./character";

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
  ilvl?: number;
}

/** A spell or attack in flight. Plain data: where it is, how it moves and what it can hit. */
export class Spell {
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
  private allowedTargets: Array<string>;
  private maxActiveTime: number | undefined;
  private maxDistance: number;
  private bodySize: number;
  private scale: number;
  /** Set for spells with a box instead of a circle (quake). */
  private box: { halfWidth: number; halfHeight: number } | null = null;
  private hitIds: Array<string> = [];
  private direction: string;
  private isMeleeAttack: boolean;
  private isRangedAttack: boolean;
  private abilitySlot?: AbilitySlot;
  private action: string;
  private isMissile: boolean;
  private isLunge = false;

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
      ilvl = 1,
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

    const { details, found } = resolveSpellDetails(spellName);
    if (!found) console.log("❌ Shit, the spell does not exist in spellDetails!");
    const shape = getSpellShape(details, ilvl);

    this.isMeleeAttack = !!shape.isMeleeAttack;
    this.isRangedAttack = !!shape.isRangedAttack;
    this.allowedTargets = shape.allowedTargets as string[];
    this.maxActiveTime = shape.maxActiveTime;
    this.bodySize = shape.bodySize ?? 0;
    this.maxDistance = shape.maxDistance; //for ranged attacks
    this.isMissile = shape.isMissile;
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
    }

    const flight = getSpellFlight(shape, castAngle, this.action, (hand) =>
      caster.getWeaponRange(hand),
    );
    if (flight) {
      ({ x: this.velocityX, y: this.velocityY } = flight.velocity);
      this.maxDistance = flight.maxDistance ?? this.maxDistance;
    }
    if (spellName == "quake") {
      this.box = { halfWidth: this.bodySize * 2, halfHeight: this.bodySize };
      this.y = this.caster.y + 6;
    }
    if (BUFF_SPELLS.includes(spellName)) {
      this.stickToCaster = true;
    }
    if (details?.isLunge) {
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
  /** The area this spell hits right now. */
  getShape(): Shape | null {
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
      // Casting stealth won't dispel anything.
      if (this?.spellName !== "stealth") {
        this?.caster?.dispelBuffsByProperty("dispelAfterAttack");
      }
      return;
    }
    this.adjustSpellPosition();
    this.checkCollisions();
  }
  checkCollisions() {
    if (this?.state?.isExpired) return;
    const { target, caster, world } = this;
    const victims = [
      ...entitiesInRoom(world.npcs, this.room?.name),
      ...entitiesInRoom(world.players, this.room?.name),
    ] as unknown as Array<ServerCharacter>;
    const shape = this.getShape();
    const victimShapes = victims.filter(Boolean).map((v) => ({
      id: v.id,
      isDead: v.state?.isDead,
      x: v.x,
      y: v.y,
      bodySize: v.bodySize,
      hitBoxSize: v.hitBoxSize,
      hitBoxInset: v.hitBoxInset,
    }));
    const hits = findSpellHits({
      shape,
      victims: victimShapes,
      hitIds: this.hitIds,
      allowedTargets: this.allowedTargets,
      caster: { id: caster?.id, x: caster.x, y: caster.y, isPlayer: caster?.kind === "player" },
      targetId: target?.id,
      direction: this.direction,
      isMeleeAttack: this.isMeleeAttack,
    });
    if (hits.length === 0) return;
    this.hitIds = [...new Set([...this.hitIds, ...hits])];
    /* Everyone hit this tick lands together, so their drains add up into one total. Without an
     * ability slot it is an attack. */
    this.caster.doHit(hits, this.abilitySlot);
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
