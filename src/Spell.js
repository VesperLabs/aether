import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";
class Spell extends Phaser.GameObjects.Container {
  constructor(scene, caster, spellName) {
    super(scene, caster.x, caster.y);
    this.caster = caster;
    this.aliveTime = 0; // how long it has been alive.
    this.scene = scene;
    this.spellName = spellName;
    this.frame = 0;
    this.hitIds = []; //who has this npc hit?
    this.canHitSelf = true;
    this.maxVisibleTime = 200;
    this.maxActiveTime = 100;
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));
    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
    this.setDepth(this?.caster?.depth - 10);
    if (["attack_left", "attack_right"]?.includes(spellName)) {
      if (spellName === "attack_left") {
        this.canHitSelf = false;
        this.spell.setTexture("misc-slash");
        const rangeLeft = caster?.equipment?.handLeft?.stats?.range * 2 || 1;
        this.body.setCircle(rangeLeft * 16, -rangeLeft * 16, -rangeLeft * 16);
        this.spell.displayWidth = 50 * rangeLeft;
        this.spell.displayHeight = 50 * rangeLeft;
        this.spell.setFlipX(true);
        if (caster?.equipment?.handLeft?.base === "katar" && caster?.direction === "left") {
          this.spell.setFlipX(false);
        }
      }
      if (spellName === "attack_right") {
        this.canHitSelf = false;
        this.spell.setTexture("misc-slash");
        const rangeRight = caster?.equipment?.handRight?.stats?.range * 2 || 1;
        this.body.setCircle(rangeRight * 16, -rangeRight * 16, -rangeRight * 16);
        this.spell.displayWidth = 50 * rangeRight;
        this.spell.displayHeight = 50 * rangeRight;
        this.spell.setFlipX(false);
        if (caster?.equipment?.handRight?.base === "katar" && caster?.direction === "left") {
          this.spell.setFlipX(true);
        }
      }
      if (caster?.direction === "up") {
        this.spell.setAngle(180);
      }
      if (caster?.direction === "down") {
        this.spell.setAngle(0);
        this.spell.y = this?.caster?.bodyOffsetY;
      }
      if (caster?.direction === "left") {
        this.spell.setAngle(90);
      }
      if (caster?.direction === "right") {
        this.spell.setAngle(-90);
      }
      /* Animate it out */
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
      /* Add to the caster so that it follows them (Some spells will be just this.add) */
      this.caster.add(this.spell);
    }
    if (spellName == "fireball") {
      // this.spell = new Phaser.GameObjects.Sprite(this.scene, 0, 0, "spell-anim-fireball", 0);
      // scene.physics.add.existing(this);
      // this.body.setCircle(32, -32, -32);
      // const angle = Phaser.Math.Angle.Between(this.x, this.y, cursor.x, cursor.y);
      // this.scene.physics.velocityFromRotation(angle, 300, this.body.velocity);
      // this.setRotation(angle);
      // this.setScale(0.5);
    }
    if (spellName == "chakra") {
      // this.spell = new Phaser.GameObjects.Sprite(this.scene, 0, 0, "spell-anim-chakra", 0);
      // scene.physics.add.existing(this);
      // this.body.setCircle(64, -64, -64);
    }
  }
  create() {}
  update(time, deltaTime) {
    if (!this.scene) return; //sometimes plays an extra loop after destroy
    /* Step up the alive time */
    this.aliveTime += deltaTime;
    const isSpellExpired = this.aliveTime > this.maxVisibleTime;
    const isSpellActive = this.aliveTime < this.maxActiveTime;
    /* Only check collisions for hero if the spell is active */
    if (this.caster.isHero && isSpellActive) {
      this.checkCollisions();
    }
    /* Remove the spell */
    if (isSpellExpired) {
      this.destroy();
    }
  }
  checkCollisions() {
    const { spellName, caster, scene, canHitSelf } = this;
    const direction = caster?.direction;
    const npcs = scene.npcs?.getChildren() || [];
    const players = scene.players?.getChildren() || [];
    [...npcs, ...players]?.forEach((victim) => {
      if (!victim || this.hitIds.includes(victim?.id)) return;
      if (!canHitSelf && victim?.id == caster?.id) return;
      if (scene.physics.overlap(victim, this)) {
        /* For attacks, prevent collision behind the player */
        if (spellName === "attack") {
          if (direction === "up" && victim.y > caster.y) return;
          if (direction === "down" && victim.y < caster.y) return;
          if (direction === "left" && victim.x > caster.x) return;
          if (direction === "right" && victim.x < caster.x) return;
        }
        this.hitIds.push(victim?.id);
        scene.socket.emit("hit", { ids: this.hitIds, spellName });
      }
    });
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

export default Spell;
