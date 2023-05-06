import Phaser from "phaser";
import { playAudio } from "./utils";
import { getAngleFromDirection } from "../shared/utils";
import spellDetails from "../shared/data/spellDetails.json";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";
class Spell extends Phaser.GameObjects.Container {
  constructor(scene, { id, caster, spellName, abilitySlot, state, castAngle, ilvl }) {
    super(scene, caster.x, caster.y);
    this.scene = scene;
    this.id = id;
    this.caster = caster;
    this.state = { aliveTime: 0, ...state };
    this.spellName = spellName;
    this.abilitySlot = abilitySlot;
    this.frame = 0;
    this.touchedIds = []; //who has this npc hit?
    this.hitIds = [];
    this.isAttack = ["attack_left", "attack_right"]?.includes(spellName);
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));
    const details = spellDetails[spellName];
    this.allowedTargets = details?.allowedTargets;
    this.maxVisibleTime = details?.maxVisibleTime;
    this.maxActiveTime = details?.maxActiveTime;
    this.spellSpeed = details?.spellSpeed;
    this.bodySize = details?.bodySize;
    this.scaleBase = details?.scaleBase;
    this.scaleMultiplier = details?.scaleMultiplier;

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    if (this.isAttack) {
      this.setDepth(this?.caster?.depth - 10);
      this.spell.setTexture("misc-slash");
      this.spell.setAngle(getAngleFromDirection(caster?.direction) - 90);
      if (caster?.direction === "down") {
        this.spell.y = this?.caster?.bodyOffsetY;
      }
      if (spellName === "attack_left") {
        const rangeLeft = caster?.equipment?.handLeft?.stats?.range * 2 || caster?.body?.radius / 8;
        this.body.setCircle(rangeLeft * 16, -rangeLeft * 16, -rangeLeft * 16);
        this.spell.displayWidth = 50 * rangeLeft;
        this.spell.displayHeight = 50 * rangeLeft;
        this.spell.setFlipX(true);
        if (caster?.equipment?.handLeft?.base === "katar" && caster?.direction === "right") {
          this.spell.setFlipX(false);
        }
      }
      if (spellName === "attack_right") {
        const rangeRight =
          caster?.equipment?.handRight?.stats?.range * 2 || caster?.body?.radius / 8;
        this.body.setCircle(rangeRight * 16, -rangeRight * 16, -rangeRight * 16);
        this.spell.displayWidth = 50 * rangeRight;
        this.spell.displayHeight = 50 * rangeRight;
        this.spell.setFlipX(false);
        if (caster?.equipment?.handRight?.base === "katar" && caster?.direction === "left") {
          this.spell.setFlipX(true);
        }
      }
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
      this.caster.add(this.spell);
    }
    if (spellName === "fireball") {
      this.setDepth(this?.caster?.depth + 10);
      this.spell.play("spell-anim-fireball");
      this.body.setCircle(this.bodySize, -this.bodySize, -this.bodySize);
      this.scene.physics.velocityFromRotation(castAngle, this.spellSpeed, this.body.velocity);
      this.spell.setRotation(castAngle);
      this.spell.setScale(this.scaleBase + ilvl * this.scaleMultiplier);
      this.add(this.spell);
    }
    if (spellName === "chakra") {
      // this.spell = new Phaser.GameObjects.Sprite(this.scene, 0, 0, "spell-anim-chakra", 0);
      // scene.physics.add.existing(this);
      // this.body.setCircle(64, -64, -64);
    }

    playSpellAudio({ scene, spellName, caster, isAttack: this.isAttack });
  }
  create() {}
  update(time, deltaTime) {
    if (!this.scene) return; //sometimes plays an extra loop after destroy
    /* Step up the alive time */
    this.state.aliveTime += deltaTime;
    const isSpellExpired = this.state.aliveTime > this.maxVisibleTime;
    const isSpellActive = this.state.aliveTime < this.maxActiveTime;
    /* Only check collisions for hero if the spell is active */
    if (this.caster.isHero && isSpellActive) {
      /* Prime it and then send it */
      this.checkCollisions();
      this.checkCollisions(true);
    }
    /* Remove the spell */
    if (isSpellExpired) {
      this.destroy();
    }
  }
  checkCollisions(sendServer = false) {
    const { abilitySlot, caster, scene } = this || {};
    const direction = caster?.direction;
    const npcs = scene.npcs?.getChildren() || [];
    const players = scene.players?.getChildren() || [];
    [...npcs, ...players]?.forEach((victim) => {
      if (!victim || this.hitIds.includes(victim?.id) || victim?.state?.isDead) return;
      if (scene.physics.overlap(victim, this)) {
        /* For attacks, prevent collision behind the player */
        if (this.isAttack) {
          if (direction === "up" && victim.y > caster.y) return;
          if (direction === "down" && victim.y < caster.y) return;
          if (direction === "left" && victim.x > caster.x) return;
          if (direction === "right" && victim.x < caster.x) return;
        }
        this.touchedIds.push(victim?.id);
        if (sendServer) {
          /* remove hitIds from touchedIds */
          this.touchedIds = this.touchedIds.filter((id) => !this.hitIds.includes(id));
          scene.socket.emit("hit", { ids: [...new Set(this.touchedIds)], abilitySlot });
          /* track which touchedIds were sent to the server */
          this.hitIds = [...this.hitIds, ...this.touchedIds];
        }
      }
    });
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

const playSpellAudio = ({ scene, spellName, caster, isAttack }) => {
  let audioKey = null;
  if (isAttack) {
    audioKey = "melee-swing-1";
  }
  if (spellName === "fireball") {
    audioKey = "spell-fireball";
  }
  return playAudio({ scene, audioKey, caster });
};

export default Spell;
