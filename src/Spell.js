import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;

class Spell extends Phaser.GameObjects.Container {
  constructor(scene, caster, spellName) {
    super(scene, caster.x, caster.y);
    this.caster = caster;
    this.aliveTime = 0; // how long it has been alive.
    this.scene = scene;
    this.spellName = spellName;
    this.frame = 0;
    this.hitIds = []; //who has this npc hit?

    /* TODO: Once we have enough spells, we can convert this to read a JSON file */
    if (spellName === "attack") {
      this.spell = scene.add.existing(new Sprite(scene, 0, 0, "misc-slash", 0));
      scene.physics.add.existing(this);
      this.maxVisibleTime = 1000;
      this.maxActiveTime = 100;
      if (caster?.action === "attack_left") {
        const rangeLeft = caster?.equipment?.handLeft?.stats?.range * 2;
        this.body.setCircle(rangeLeft * 16, -rangeLeft * 16, -rangeLeft * 16);
        this.spell.displayWidth = 50 * rangeLeft;
        this.spell.displayHeight = 50 * rangeLeft;
        this.spell.setFlipX(true);
      }
      if (caster?.action === "attack_right") {
        const rangeRight = caster?.equipment?.handRight?.stats?.range * 2;
        this.body.setCircle(rangeRight * 16, -rangeRight * 16, -rangeRight * 16);
        this.spell.displayWidth = 50 * rangeRight;
        this.spell.displayHeight = 50 * rangeRight;
        this.spell.setFlipX(false);
      }
      if (caster?.direction === "up") {
        this.spell.setAngle(180);
      }
      if (caster?.direction === "down") {
        this.spell.setAngle(0);
        this.spell.y = this?.caster?.bodyOffsetY;
      }
      if (caster?.direction === "left") this.spell.setAngle(90);
      if (caster?.direction === "right") this.spell.setAngle(-90);
      this.spell.setAlpha(1);
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
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
    this.setDepth(this?.caster?.depth - 10);
  }
  create() {}
  update(time, deltaTime) {
    if (!this.scene) return; //sometimes plays an extra loop after destroy
    /* Step up the alive time */
    this.aliveTime += deltaTime;
    const isSpellExpired = this.aliveTime > this.maxVisibleTime;
    const isSpellActive = this.aliveTime < this.maxActiveTime;

    if (this.spellName === "attack") {
      if (this.spell.alpha > 0) {
        this.spell.setAlpha(this.spell.alpha - 0.1);
      }
    }
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
    const { spellName, caster, scene } = this;
    const direction = caster?.direction;
    scene.npcs?.getChildren()?.forEach((npc) => {
      if (!npc || this.hitIds.includes(npc?.id)) return;
      if (scene.physics.overlap(npc, this)) {
        /* For attacks, prevent collision behind the player */
        if (spellName === "attack") {
          if (direction === "up" && npc.y > caster.y) return;
          if (direction === "down" && npc.y < caster.y) return;
          if (direction === "left" && npc.x > caster.x) return;
          if (direction === "right" && npc.x < caster.x) return;
        }
        this.hitIds.push(npc?.id);
        scene.socket.emit("hit", { entity: "npc", ids: this.hitIds, spellName });
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
