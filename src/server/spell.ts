import type { AbilitySlot } from "@/rules/spells";
import type { ServerWorld } from "./server-world";
import { distanceTo } from "@/rules/world";
import { entitiesInRoom } from "@/rules/world";
import type { Shape } from "@/rules/movement";
import {
  BUFF_SPELLS,
  findSpellHits,
  getSpellShape,
  getSpellVelocity,
  isSpellExpired,
  resolveSpellDetails,
  usesLeftHand,
  usesRightHand,
} from "@/rules/spells";
import { ServerCharacter } from "./character";

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
    this.state = { spawnTime: Date.now(), isExpired: false };
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
    const spellSpeed = shape.spellSpeed;

    if (this.isMeleeAttack) {
      /* Hack: Up range is too long. This hack makes the top-down view more realistic */
      if (caster?.direction === "up" || caster.profile.race !== "human") {
        this.y = this.caster.y;
      }

      if (usesLeftHand(this.action)) this.bodySize = caster?.getWeaponRange("handLeft");
      // npcs without attack animations will stand here
      if (usesRightHand(this.action)) this.bodySize = caster?.getWeaponRange("handRight");
    }

    if (this.isRangedAttack) {
      ({ x: this.velocityX, y: this.velocityY } = getSpellVelocity(castAngle, spellSpeed));
      this.maxDistance = usesLeftHand(this.action)
        ? caster?.getWeaponRange("handLeft")
        : caster?.getWeaponRange("handRight");
    }
    if (this.isMissile) {
      // for the ball attacks
      ({ x: this.velocityX, y: this.velocityY } = getSpellVelocity(castAngle, spellSpeed));
    }
    if (spellName == "quake") {
      this.box = { halfWidth: this.bodySize * 2, halfHeight: this.bodySize };
      this.y = this.caster.y + 6;
    }
    if (BUFF_SPELLS.includes(spellName)) {
      this.stickToCaster = true;
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
      now: Date.now(),
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
    const hits = findSpellHits({
      shape: this.getShape(),
      victims: victims.filter(Boolean).map((v) => ({
        id: v.id,
        isDead: v.state?.isDead,
        x: v.x,
        y: v.y,
        bodySize: v.bodySize,
        hitBoxSize: v.hitBoxSize,
      })),
      hitIds: this.hitIds,
      allowedTargets: this.allowedTargets,
      caster: { id: caster?.id, x: caster.x, y: caster.y, isPlayer: caster?.kind === "player" },
      targetId: target?.id,
      direction: this.direction,
      isMeleeAttack: this.isMeleeAttack,
    });
    for (const id of hits) {
      this.hitIds = [...new Set([...this.hitIds, id])];
      // One hit at a time; without an ability slot it is an attack.
      this.caster.doHit([id], this.abilitySlot);
    }
  }
  adjustSpellPosition() {
    if (this.stickToCaster) {
      this.x = this.caster.x;
      this.y = this.caster.y + this.caster.bodyCenterY;
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
