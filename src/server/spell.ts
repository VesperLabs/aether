import { distanceTo } from "@/shared/rules/world";
import { entitiesInRoom } from "@/shared/rules/world";
import { shapesOverlap, type Shape } from "@/shared/rules/movement";
import {
  BUFF_SPELLS,
  characterBodyCircle,
  characterHitBox,
  getSpellShape,
  getSpellVelocity,
  isBehindCaster,
  isSpellExpired,
  isSpellVictimCandidate,
  resolveSpellDetails,
  usesLeftHand,
  usesRightHand,
} from "@/shared/rules/spells";
import { ServerCharacter } from "./character";

/** A spell or attack in flight. Plain data: where it is, how it moves and what it can hit. */
export class Spell {
  public id: string;
  public x: number;
  public y: number;
  public room: Room;
  public caster: ServerCharacter;
  public target: any;
  public spellName: string;
  public spawnPoint: Coordinate;
  public state: any;
  public world: ServerWorld;
  public stickToCaster = false;
  /** Velocity in pixels per second. */
  public velocityX = 0;
  public velocityY = 0;
  private allowedTargets: Array<string>;
  private maxActiveTime: number;
  private maxDistance: number;
  private bodySize: number;
  private scale: number;
  /** Set for spells with a box instead of a circle (quake). */
  private box: { halfWidth: number; halfHeight: number } | null = null;
  private hitIds: Array<string> = [];
  private direction: string;
  private isMeleeAttack: boolean;
  private isRangedAttack: boolean;
  private abilitySlot: number;
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
    },
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

    this.isMeleeAttack = shape.isMeleeAttack;
    this.isRangedAttack = shape.isRangedAttack;
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
      lifetime: this.maxActiveTime,
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
    const { target, caster, world, allowedTargets, abilitySlot } = this;
    const direction = this?.direction;
    const shape = this.getShape();
    if (!shape) return;
    const victims = [
      ...entitiesInRoom(world.npcs, this.room?.name),
      ...entitiesInRoom(world.players, this.room?.name),
    ] as unknown as Array<ServerCharacter>;
    const isNpcSingleTargetMelee = target?.id && caster?.kind !== "player" && this.isMeleeAttack;

    for (const victim of victims) {
      if (!victim) continue;
      if (
        !isSpellVictimCandidate({
          victimId: victim.id,
          victimIsDead: victim.state?.isDead,
          hitIds: this.hitIds,
          allowedTargets,
          casterId: caster?.id,
          targetId: target?.id,
        })
      ) {
        continue;
      }
      /* Make hitbox smaller for npc melee hits. */
      const area = isNpcSingleTargetMelee
        ? ({ kind: "circle", ...characterBodyCircle(victim) } as Shape)
        : ({ kind: "box", ...characterHitBox(victim) } as Shape);
      if (shapesOverlap(area, shape)) {
        /* For attacks, prevent collision behind the player */
        if (this.isMeleeAttack && isBehindCaster(direction, victim, caster)) continue;

        // keep track of all the characters this spell hit
        this.hitIds = [...new Set([...this.hitIds, victim.id])];
        // send one hit at a time
        this.caster.doHit([victim.id], abilitySlot); // if we don't have an ability slot, we are doing an attack
      }
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
