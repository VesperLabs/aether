import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;

class Buff extends Phaser.GameObjects.Container {
  constructor(scene, victim, buffName) {
    super(scene, victim.x, victim.y);

    this.victim = victim;
    this.buff = new Sprite(scene, 0, 0, `spell-${buffName}`);
    this.buff.setOrigin(0.5);
    this.victim.add(this.buff);

    this.scale = 0;
    this.alpha = 0;
    this.buff.y = this.victim.bodyOffsetY;

    scene.tweens.add({
      targets: this.buff,
      props: {
        scale: {
          value: () => 2,
          ease: "Linear",
        },
        alpha: {
          value: () => 0,
          ease: "Linear",
        },
      },
      duration: 300,
      yoyo: false,
      repeat: 0,
      onComplete: () => {
        this.buff.destroy();
        this.destroy();
      },
    });

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update() {
    this.victim.bringToTop(this.buff);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Buff;
