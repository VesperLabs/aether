// @ts-nocheck
import Phaser from "phaser";
import { playAudio } from "../utils";
import { spellDetails, getAngleFromDirection, BUFF_SPELLS, distanceTo } from "@aether/shared";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";

const SPELL_NAME_ANIM_MAP = {
  "attack-melee": "spell-anim-slash-physical",
  "flame-slash": "spell-anim-slash-fire",
};

class Spell extends Phaser.GameObjects.Container {
  constructor(scene, { id, caster, spellName, action, castAngle = 0, ilvl = 1 }) {
    const spawnPoint = { x: caster.x, y: caster.y + caster.bodyCenterY };
    super(scene, spawnPoint.x, spawnPoint.y);

    this.spawnPoint = spawnPoint;
    this.id = id;
    this.scene = scene;
    this.caster = caster;
    this.spellName = spellName;
    this.state = {
      spawnTime: Date.now(),
      isExpired: false,
    };
    this.velocityX = 0;
    this.velocityY = 0;
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));

    let details = spellDetails?.[spellName];

    if (!details) {
      console.log("❌ Shit, the spell does not exist in spellDetails!");
      details = spellDetails?.["attack-melee"];
    }

    this.isMeleeAttack = details?.isMeleeAttack;
    this.isRangedAttack = details?.isRangedAttack;
    this.layerDepth = details?.layerDepth;
    this.allowedTargets = details?.allowedTargets;
    this.maxVisibleTime = details?.maxVisibleTime;
    this.spellSpeed = details?.spellSpeed;
    this.bodySize = details?.bodySize;
    this.scaleBase = details?.scaleBase ?? 1;
    this.scaleMultiplier = details?.scaleMultiplier ?? 0;
    this.spell.setTint(details?.tint || "0xFFFFFF");
    this.shouldFade = details?.shouldFade || false;
    this.maxDistance = details?.maxDistance ?? -1; //for ranged attacks
    this.action = action ?? "attack_right";
    this.isMissile = details?.isMissile ?? false;

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);

    if (this.isMeleeAttack) {
      let viewSize = 44;
      let tiltAngle = 48;
      const attackSpellAnim = SPELL_NAME_ANIM_MAP[this.spellName];
      const numFrames = this.scene.anims.get(attackSpellAnim)?.frames?.length;

      this.spell.play(attackSpellAnim);
      this.spell.anims.msPerFrame = Math.floor(this.maxVisibleTime / numFrames);
      this.spell.setAngle(getAngleFromDirection(caster?.direction) - 90);

      this.stickToCaster = true;
      /* Hack: Up range is too long. This hack makes the top-down view more realistic */
      if (caster?.direction === "up") {
        this.y = this.caster.y;
      }

      /* Hack: fixes placement for non-human units .*/
      if (caster.profile.race !== "human") {
        const difference = (this.caster.hitBox.body.height - this.caster.body.height) / 2;
        this.y = this.caster.y - difference;
      }

      if (this.action.includes("attack_left")) {
        this.setAngle(tiltAngle);
        const rangeLeft = caster?.equipment?.handLeft?.stats?.range * 2 || caster?.body?.radius / 8;

        this.spell.displayWidth = viewSize * rangeLeft;
        this.spell.displayHeight = viewSize * rangeLeft;
        this.spell.setFlipX(false);
      }

      // npcs without attack animations will stand here
      if (this.action.includes("attack_right") || this.action === "stand") {
        this.setAngle(-tiltAngle);
        const rangeRight =
          caster?.equipment?.handRight?.stats?.range * 2 || caster?.body?.radius / 8;

        this.spell.displayWidth = viewSize * rangeRight;
        this.spell.displayHeight = viewSize * rangeRight;
        this.spell.setFlipX(true);
      }
      this.setScale(this?.caster?.proScale);
    } else {
      this.setScale(this.scaleBase + ilvl * this.scaleMultiplier);
    }

    if (this.isRangedAttack) {
      this.spell.setTexture("icons", "arrow");
      this.velocityX = Math.cos(castAngle) * this?.spellSpeed;
      this.velocityY = Math.sin(castAngle) * this?.spellSpeed;
      this.spell.setRotation(castAngle + 0.785398163);
      this.maxDistance = action.includes("attack_left")
        ? caster?.getWeaponRange("handLeft")
        : caster?.getWeaponRange("handRight");
    }
    if (this.isMissile) {
      this.spell.play(`spell-anim-${spellName}`);
      this.velocityX = Math.cos(castAngle) * this?.spellSpeed;
      this.velocityY = Math.sin(castAngle) * this?.spellSpeed;
      this.spell.setRotation(castAngle);
    }
    if (spellName === "quake") {
      this.body.setSize(this?.bodySize * 4, this?.bodySize * 2);
      this.y = this.caster.y + 6;
      this.body.setOffset(-this.bodySize * 2, -this.bodySize);
      this.spell.play(`spell-anim-${spellName}`);
    }
    if (BUFF_SPELLS.includes(spellName)) {
      this.spell.play("spell-anim-chakra");
      this.stickToCaster = true;
    }

    if (this.shouldFade) {
      scene.tweens.add({
        targets: this.spell,
        props: {
          alpha: {
            value: () => 0,
            ease: "Power4",
          },
        },
        duration: this.maxVisibleTime,
        yoyo: false,
        repeat: 0,
      });
    }

    this.add(this.spell);
    this.adjustSpellPosition();
    playSpellAudio({ scene, spellName, caster, isMeleeAttack: this.isMeleeAttack });
  }
  create() {}
  update() {
    this.state.isExpired =
      this?.maxDistance > -1
        ? distanceTo(this, this.spawnPoint) >= this.maxDistance
        : Date.now() - this.state.spawnTime > this.maxVisibleTime;
    if (!this.scene || this.state.isExpired) return this.destroy(true);
    this.adjustSpellPosition();
  }
  adjustSpellPosition() {
    if (this.layerDepth === "bottom") {
      this.setDepth(this?.caster?.depth - 20);
    }
    if (this.layerDepth === "top") {
      this.setDepth(100 + this.y + this.bodySize);
    }
    if (this.stickToCaster) {
      this.x = this.caster.x;
      this.y = this.caster.y + this.caster.bodyCenterY;
      return;
    }
    this.body.setVelocity(this.velocityX, this.velocityY);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

const playSpellAudio = ({ scene, spellName, caster, isMeleeAttack }) => {
  let audioKey = null;
  if (isMeleeAttack) {
    audioKey = "melee-swing-1";
  }
  if (spellName === "fireball") {
    audioKey = "spell-fireball";
  }
  if (spellName === "waterball") {
    audioKey = "spell-water";
  }
  if (spellName === "lightball") {
    audioKey = "spell-light";
  }
  if (spellName === "quake") {
    audioKey = "spell-earth";
  }
  if (BUFF_SPELLS.includes(spellName)) {
    audioKey = "spell-buff-1";
  }
  return playAudio({ scene, audioKey, caster });
};

export default Spell;
