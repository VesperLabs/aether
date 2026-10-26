import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;
import { distanceTo } from "../shared";
import {
  BUFF_SPELLS,
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

export class Spell extends Phaser.GameObjects.Container {
  public id: string;
  public room: Room;
  public caster: ServerCharacter;
  public target: Character;
  public spellName: string;
  public spawnPoint: Coordinate;
  declare state: any;
  private velocityX: number;
  private velocityY: number;
  private allowedTargets: Array<string>;
  private maxActiveTime: integer;
  private maxDistance: integer;
  private bodySize: integer;
  private spellSpeed: integer;
  private hitIds: Array<string>;
  private direction: string;
  private isMeleeAttack: boolean;
  private isRangedAttack: boolean;
  private abilitySlot: number;
  private spell: Phaser.GameObjects.Sprite;
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: ServerScene;
  declare stickToCaster: boolean;
  private action: string;
  private isMissile: boolean;

  constructor(
    scene: ServerScene,
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
    const spawnPoint = { x: caster.x, y: caster.y + caster.bodyCenterY };
    super(scene, spawnPoint.x, spawnPoint.y);

    this.spawnPoint = spawnPoint;
    this.id = id;
    this.scene = scene;
    this.room = room;
    this.caster = caster;
    this.target = target;
    this.spellName = spellName;
    this.direction = direction ?? caster?.direction;
    this.state = {
      spawnTime: Date.now(),
      isExpired: false,
    };
    this.velocityX = 0;
    this.velocityY = 0;
    this.hitIds = [];
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, "blank", 0));
    this.abilitySlot = abilitySlot;
    this.action = action ?? "attack_right";

    const { details, found } = resolveSpellDetails(spellName);
    if (!found) console.log("❌ Shit, the spell does not exist in spellDetails!");
    const shape = getSpellShape(details, ilvl);

    this.isMeleeAttack = shape.isMeleeAttack;
    this.isRangedAttack = shape.isRangedAttack;
    this.allowedTargets = shape.allowedTargets as string[];
    this.maxActiveTime = shape.maxActiveTime;
    this.bodySize = shape.bodySize;
    this.spellSpeed = shape.spellSpeed;
    this.maxDistance = shape.maxDistance; //for ranged attacks
    this.isMissile = shape.isMissile;

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    this.setScale(shape.scale);
    this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);

    if (this.isMeleeAttack) {
      //this.stickToCaster = true;
      let viewSize = 44;

      /* Hack: Up range is too long. This hack makes the top-down view more realistic */
      if (caster?.direction === "up" || caster.profile.race !== "human") {
        this.y = this.caster.y;
      }

      if (usesLeftHand(this.action)) {
        const rangeLeft = caster?.getWeaponRange("handLeft");
        this.body.setCircle(rangeLeft, -rangeLeft, -rangeLeft);
        this.spell.displayWidth = viewSize * rangeLeft;
        this.spell.displayHeight = viewSize * rangeLeft;
      }

      // npcs without attack animations will stand here
      if (usesRightHand(this.action)) {
        const rangeRight = caster?.getWeaponRange("handRight");
        this.body.setCircle(rangeRight, -rangeRight, -rangeRight);
        this.spell.displayWidth = viewSize * rangeRight;
        this.spell.displayHeight = viewSize * rangeRight;
      }
    }

    if (this.isRangedAttack) {
      ({ x: this.velocityX, y: this.velocityY } = getSpellVelocity(castAngle, this.spellSpeed));
      this.spell.setRotation(castAngle);
      this.maxDistance = usesLeftHand(this.action)
        ? caster?.getWeaponRange("handLeft")
        : caster?.getWeaponRange("handRight");
    }
    if (this.isMissile) {
      // for the ball attacks
      ({ x: this.velocityX, y: this.velocityY } = getSpellVelocity(castAngle, this.spellSpeed));
      this.spell.setRotation(castAngle);
    }
    if (spellName == "quake") {
      this.body.setSize(this?.bodySize * 4, this?.bodySize * 2);
      this.y = this.caster.y + 6;
      this.body.setOffset(-this.bodySize * 2, -this.bodySize);
    }
    if (BUFF_SPELLS.includes(spellName)) {
      this.stickToCaster = true;
    }

    this.add(this.spell);
    this.adjustSpellPosition();
    /* TODO: When we add buffs, make sure they do the same as adjustSpellPosition on clientside */
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
    const { target, caster, scene, allowedTargets, abilitySlot } = this;
    const direction = this?.direction;
    const players = this.room.playerManager.players?.getChildren() || [];
    const npcs = this.room.npcManager.npcs?.getChildren() || [];
    const isNpcSingleTargetMelee = target?.id && caster?.kind !== "player" && this.isMeleeAttack;

    [...npcs, ...players]?.every((victim) => {
      if (!victim) return true;
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
        return true;
      }
      /* Make hitbox smaller for npc melee hits. */
      const body = isNpcSingleTargetMelee ? victim : victim?.hitBox;
      if (scene.physics.overlap(body, this)) {
        /* For attacks, prevent collision behind the player */
        if (this.isMeleeAttack && isBehindCaster(direction, victim, caster)) return true;

        // keep track of all the characters this spell hit
        this.hitIds.push(victim.id);
        this.hitIds = [...new Set(this.hitIds)];
        // send one hit at a time
        this.caster.doHit([victim.id], abilitySlot); // if we don't have an ability slot, we are doing an attack
      }
      return true;
    });
  }
  adjustSpellPosition() {
    if (this.stickToCaster) {
      this.x = this.caster.x;
      this.y = this.caster.y + this.caster.bodyCenterY;
      return;
    }
    this.body.setVelocity(this.velocityX, this.velocityY);
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
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}
