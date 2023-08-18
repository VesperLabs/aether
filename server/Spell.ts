import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;
import { spellDetails, BUFF_SPELLS } from "@aether/shared";

class Spell extends Phaser.GameObjects.Container {
  public id: string;
  public room: Room;
  public caster: Character;
  public target: Character;
  public spellName: string;
  declare state: any;
  private velocityX: number;
  private velocityY: number;
  private allowedTargets: Array<string>;
  private maxVisibleTime: integer;
  private maxActiveTime: integer;
  private bodySize: integer;
  private scaleBase: number;
  private scaleMultiplier: number;
  private spellSpeed: integer;
  private hitIds: Array<string>;
  private isAttack: boolean;
  private abilitySlot: number;
  private spell: Phaser.GameObjects.Sprite;
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: ServerScene;
  declare stickToCaster: boolean;
  constructor(
    scene: ServerScene,
    { id, room, caster, target, abilitySlot, spellName, castAngle, ilvl }
  ) {
    super(scene, caster.x, caster.y + caster.bodyCenterY);
    this.id = id;
    this.scene = scene;
    this.room = room;
    this.caster = caster;
    this.target = target;
    this.spellName = spellName;
    this.state = {
      spawnTime: Date.now(),
      isExpired: false,
    };
    this.velocityX = 0;
    this.velocityY = 0;
    this.hitIds = [];
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, "blank", 0));
    this.isAttack = !abilitySlot;
    this.abilitySlot = abilitySlot;

    const details = spellDetails?.[spellName];
    this.allowedTargets = details?.allowedTargets;
    this.maxVisibleTime = details?.maxVisibleTime;
    this.maxActiveTime = details?.maxActiveTime;
    this.bodySize = details?.bodySize;
    this.spellSpeed = details?.spellSpeed;
    this.scaleBase = details?.scaleBase;
    this.scaleMultiplier = details?.scaleMultiplier || 1;

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    if (this.isAttack) {
      let viewSize = 44;
      /* Take body size of NPC caster in to account. or they wont get close enough to attack */
      const fullBodySize = this.bodySize + (caster?.body?.radius ?? 8) / 2;
      this.body.setCircle(fullBodySize, -fullBodySize, -fullBodySize);

      /* Hack: Up range is too long. This hack makes the top-down view more realistic */
      if (caster?.direction === "up") {
        this.y = this.caster.y;
      }

      /* Hack: fixes placement for non-human units .*/
      if (caster.profile.race !== "human") {
        const difference = (this.caster.hitBox.body.height - this.caster.body.height) / 2;
        this.y = this.caster.y - difference;
      }

      if (spellName.includes("attack_left")) {
        const rangeLeft = caster?.equipment?.handLeft?.stats?.range * 2 || fullBodySize;
        this.body.setCircle(rangeLeft * 14, -rangeLeft * 14, -rangeLeft * 14);
        this.spell.displayWidth = viewSize * rangeLeft;
        this.spell.displayHeight = viewSize * rangeLeft;
      }
      if (spellName.includes("attack_right")) {
        const rangeRight = caster?.equipment?.handRight?.stats?.range * 2 || fullBodySize;
        this.body.setCircle(rangeRight * 14, -rangeRight * 14, -rangeRight * 14);
        this.spell.displayWidth = viewSize * rangeRight;
        this.spell.displayHeight = viewSize * rangeRight;
      }
    } else {
      this.setScale(this.scaleBase + ilvl * this.scaleMultiplier);
      this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);
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
    if (spellName == "voltball") {
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
    const now = Date.now();
    this.adjustSpellPosition();
    this.checkCollisions();
    this.body.setVelocity(this.velocityX, this.velocityY);
    this.state.isExpired = now - this.state.spawnTime > this.maxActiveTime;
  }
  checkCollisions() {
    const { target, caster, scene, allowedTargets, abilitySlot } = this;
    const direction = caster?.direction;
    const players = this.room.playerManager.players?.getChildren() || [];
    const npcs = this.room.npcManager.npcs?.getChildren() || [];
    [...npcs, ...players]?.every((victim) => {
      if (!victim || this.hitIds.includes(victim?.id) || victim?.state?.isDead) return true;

      /* If its not a self-hitting spell */
      if (!allowedTargets?.includes("self") && victim?.id === caster?.id) return true;

      /* If its a single target skip all other targets */
      if (target?.id && victim?.id !== target?.id) return true;

      /* For NPCS, make their attack radius less */
      const hitBox = this.isAttack && this?.caster?.kind !== "player" ? victim : victim?.hitBox;
      if (scene.physics.overlap(hitBox, this)) {
        /* For attacks, prevent collision behind the player */
        if (this.isAttack) {
          if (direction === "up" && victim.y > caster.y) return true;
          if (direction === "down" && victim.y < caster.y) return true;
          if (direction === "left" && victim.x > caster.x) return true;
          if (direction === "right" && victim.x < caster.x) return true;
        }

        // keep track of all the characters this spell hit
        this.hitIds.push(victim.id);
        this.hitIds = [...new Set(this.hitIds)];
        // send one hit at a time
        this.caster.doHit([victim.id], abilitySlot);
      }
      return true;
    });
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
