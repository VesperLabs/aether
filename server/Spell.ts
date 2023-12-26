import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;
import { spellDetails, BUFF_SPELLS, distanceTo } from "../shared";

class Spell extends Phaser.GameObjects.Container {
  public id: string;
  public room: Room;
  public caster: Character;
  public target: Character;
  public spellName: string;
  public spawnPoint: Coordinate;
  declare state: any;
  private velocityX: number;
  private velocityY: number;
  private allowedTargets: Array<string>;
  private maxVisibleTime: integer;
  private maxActiveTime: integer;
  private maxDistance: integer;
  private bodySize: integer;
  private scaleBase: number;
  private scaleMultiplier: number;
  private spellSpeed: integer;
  private hitIds: Array<string>;
  private direction: string;
  private isAttackMelee: boolean;
  private isAttackRanged: boolean;
  private abilitySlot: number;
  private spell: Phaser.GameObjects.Sprite;
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: ServerScene;
  declare stickToCaster: boolean;
  private action: string;

  constructor(
    scene: ServerScene,
    { id, room, caster, direction, target, abilitySlot, spellName, action, castAngle = 0, ilvl = 1 }
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
    this.isAttackMelee = spellName === "attack_melee";
    this.isAttackRanged = spellName === "attack_ranged";
    this.abilitySlot = abilitySlot;
    this.action = action;

    const details = spellDetails?.[spellName];
    if (!details) {
      throw new Error("Shit, the spell does not exist in spellDetails!");
    }

    this.allowedTargets = details?.allowedTargets;
    this.maxVisibleTime = details?.maxVisibleTime;
    this.maxActiveTime = details?.maxActiveTime;
    this.bodySize = details?.bodySize;
    this.spellSpeed = details?.spellSpeed;
    this.scaleBase = details?.scaleBase ?? 1;
    this.scaleMultiplier = details?.scaleMultiplier ?? 0;
    this.maxDistance = details?.maxDistance ?? -1; //for ranged attacks

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    this.setScale(this.scaleBase + ilvl * this.scaleMultiplier);
    this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);

    if (this.isAttackMelee) {
      //this.stickToCaster = true;
      let viewSize = 44;

      /* Hack: Up range is too long. This hack makes the top-down view more realistic */
      if (caster?.direction === "up" || caster.profile.race !== "human") {
        this.y = this.caster.y;
      }

      if (this.action.includes("attack_left")) {
        const rangeLeft = caster?.getWeaponRange("handLeft");
        this.body.setCircle(rangeLeft, -rangeLeft, -rangeLeft);
        this.spell.displayWidth = viewSize * rangeLeft;
        this.spell.displayHeight = viewSize * rangeLeft;
      }
      if (this.action.includes("attack_right")) {
        const rangeRight = caster?.getWeaponRange("handRight");
        this.body.setCircle(rangeRight, -rangeRight, -rangeRight);
        this.spell.displayWidth = viewSize * rangeRight;
        this.spell.displayHeight = viewSize * rangeRight;
      }
    }

    if (this.isAttackRanged) {
      this.velocityX = Math.cos(castAngle) * this?.spellSpeed;
      this.velocityY = Math.sin(castAngle) * this?.spellSpeed;
      this.spell.setRotation(castAngle);
      this.maxDistance = this.action.includes("attack_left_ranged")
        ? caster?.getWeaponRange("handLeft")
        : caster?.getWeaponRange("handRight");
    }
    if (spellName == "fireball") {
      this.velocityX = Math.cos(castAngle) * this?.spellSpeed;
      this.velocityY = Math.sin(castAngle) * this?.spellSpeed;
      this.spell.setRotation(castAngle);
    }
    if (spellName == "waterball") {
      this.velocityX = Math.cos(castAngle) * this?.spellSpeed;
      this.velocityY = Math.sin(castAngle) * this?.spellSpeed;
      this.spell.setRotation(castAngle);
    }
    if (spellName == "lightball") {
      this.velocityX = Math.cos(castAngle) * this?.spellSpeed;
      this.velocityY = Math.sin(castAngle) * this?.spellSpeed;
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
    const isRanged = this?.maxDistance > -1;
    this.state.isExpired = isRanged
      ? distanceTo(this, this.spawnPoint) >= this.maxDistance
      : Date.now() - this.state.spawnTime > this.maxActiveTime;

    if (this.state.isExpired) return;
    this.adjustSpellPosition();
    this.checkCollisions();
  }
  checkCollisions() {
    if (this?.state?.isExpired) return;
    const { target, caster, scene, allowedTargets, abilitySlot, spellName } = this;
    const direction = this?.direction;
    const players = this.room.playerManager.players?.getChildren() || [];
    const npcs = this.room.npcManager.npcs?.getChildren() || [];
    const isNpcSingleTargetMelee = target?.id && caster?.kind !== "player" && this.isAttackMelee;

    [...npcs, ...players]?.every((victim) => {
      if (!victim || this.hitIds.includes(victim?.id) || victim?.state?.isDead) return true;

      /* If its not a self-hitting spell */
      if (!allowedTargets?.includes("self") && victim?.id === caster?.id) return true;

      /* If its a single target skip all other targets */
      if (target?.id && victim?.id !== target?.id) return true;
      /* Make hitbox smaller for npc melee hits. */
      const body = isNpcSingleTargetMelee ? victim : victim?.hitBox;
      if (scene.physics.overlap(body, this)) {
        /* For attacks, prevent collision behind the player */
        if (this.isAttackMelee) {
          if (direction === "up" && victim.y > caster.y) return true;
          if (direction === "down" && victim.y < caster.y) return true;
          if (direction === "left" && victim.x > caster.x) return true;
          if (direction === "right" && victim.x < caster.x) return true;
        }

        // keep track of all the characters this spell hit
        this.hitIds.push(victim.id);
        this.hitIds = [...new Set(this.hitIds)];
        // send one hit at a time
        this.caster.doHit([victim.id], abilitySlot, spellName); // if we don't have an ability slot, we are doing an attack
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
      maxVisibleTime: this?.maxVisibleTime,
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

export default Spell;
