// @ts-nocheck
import Phaser from "phaser";
import { playAudio } from "../utils";
import { spellDetails, getAngleFromDirection, BUFF_SPELLS } from "@aether/shared";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";

class Spell extends Phaser.GameObjects.Container {
  constructor(scene, { id, caster, spellName, abilitySlot, state, castAngle = 0, ilvl = 1 }) {
    super(scene, caster.x, caster.y + caster.bodyCenterY);
    this.scene = scene;
    this.id = id;
    this.caster = caster;
    this.state = { aliveTime: 0, ...state };
    this.abilitySlot = abilitySlot;
    this.frame = 0;
    this.touchedIds = []; //who has this npc hit?
    this.hitIds = [];
    this.isAttackMelee = spellName === "attack_right" || spellName === "attack_left";
    this.isAttackRanged = spellName === "attack_right_ranged" || spellName === "attack_left_ranged";
    this.spellName = spellName;
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));
    const details = spellDetails[this.spellName];
    this.layerDepth = details?.layerDepth;
    this.allowedTargets = details?.allowedTargets;
    this.maxVisibleTime = details?.maxVisibleTime;
    this.maxActiveTime = details?.maxActiveTime;
    this.spellSpeed = details?.spellSpeed;
    this.bodySize = details?.bodySize;
    this.scaleBase = details?.scaleBase ?? 1;
    this.scaleMultiplier = details?.scaleMultiplier ?? 0;
    this.spell.setTint(details?.tint || "0xFFFFFF");
    this.shouldFade = details?.shouldFade || false;

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
    this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);

    if (this.isAttackMelee) {
      let viewSize = 44;
      let tiltAngle = 48;
      this.spell.play(`spell-anim-slash-physical`);
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

      if (spellName.includes("attack_left")) {
        this.setAngle(tiltAngle);
        const rangeLeft = caster?.equipment?.handLeft?.stats?.range * 2 || caster?.body?.radius / 8;

        this.spell.displayWidth = viewSize * rangeLeft;
        this.spell.displayHeight = viewSize * rangeLeft;
        this.spell.setFlipX(false);
      }
      if (spellName.includes("attack_right")) {
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

    if (this.isAttackRanged) {
      this.spell.setTexture("icons", "arrow");
      this.scene.physics.velocityFromRotation(castAngle, this.spellSpeed, this.body.velocity);
      this.spell.setRotation(castAngle + 0.785398163);
    }
    if (spellName === "fireball") {
      this.spell.play("spell-anim-fireball");
      this.scene.physics.velocityFromRotation(castAngle, this.spellSpeed, this.body.velocity);
      this.spell.setRotation(castAngle);
    }
    if (spellName === "waterball") {
      this.spell.play("spell-anim-waterball");
      this.scene.physics.velocityFromRotation(castAngle, this.spellSpeed, this.body.velocity);
      this.spell.setRotation(castAngle);
    }
    if (spellName === "voltball") {
      this.spell.play("spell-anim-voltball");
      this.scene.physics.velocityFromRotation(castAngle, this.spellSpeed, this.body.velocity);
      this.spell.setRotation(castAngle);
    }
    if (spellName === "quake") {
      this.body.setSize(this?.bodySize * 4, this?.bodySize * 2);
      this.y = this.caster.y + 6;
      this.body.setOffset(-this.bodySize * 2, -this.bodySize);
      this.spell.play("spell-anim-quake");
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
    playSpellAudio({ scene, spellName, caster, isAttackMelee: this.isAttackMelee });
  }
  create() {}
  update(time, deltaTime) {
    if (!this.scene) return; //sometimes plays an extra loop after destroy
    this.adjustSpellPosition();
    /* Step up the alive time */
    this.state.aliveTime += deltaTime;
    const isSpellExpired = this.state.aliveTime > this.maxVisibleTime;
    /* Remove the spell */
    if (isSpellExpired) {
      this.destroy(true);
    }
  }
  adjustSpellPosition() {
    if (this.stickToCaster) {
      this.x = this.caster.x;
      this.y = this.caster.y + this.caster.bodyCenterY;
    }
    if (this.layerDepth === "bottom") {
      this.setDepth(this?.caster?.depth - 20);
    }
    if (this.layerDepth === "top") {
      this.setDepth(100 + this.y + this.bodySize);
    }
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

const playSpellAudio = ({ scene, spellName, caster, isAttackMelee }) => {
  let audioKey = null;
  if (isAttackMelee) {
    audioKey = "melee-swing-1";
  }
  if (spellName === "fireball") {
    audioKey = "spell-fireball";
  }
  if (spellName === "waterball") {
    audioKey = "spell-water";
  }
  if (spellName === "voltball") {
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
