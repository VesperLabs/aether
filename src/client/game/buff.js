import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;

class Buff extends Phaser.GameObjects.Container {
  constructor(scene, victim, buffName) {
    super(scene, victim.x, victim.y);

    this.victim = victim;
    this.buff = new Sprite(scene, 0, 0, `spell-${buffName}`);
    this.buff.setOrigin(0.5);
    this.victim.add(this.buff);

    this.buff.scale = 2;
    this.buff.alpha = 0;
    this.buff.y = this.victim.bodyCenterY;

    scene.tweens.add({
      targets: this.buff,
      props: {
        scale: {
          value: () => 0,
          ease: "Linear",
        },
        alpha: {
          value: () => 1,
          ease: "Linear",
        },
      },
      duration: 500,
      yoyo: true,
      repeat: 0,
      onComplete: () => {
        this.destroy();
      },
    });

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update() {
    if (this?.victim?.state?.isDead) this.destroy();
    this.victim.bringToTop(this.buff);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    this.buff.destroy();
    super.destroy();
  }
}

export default Buff;
