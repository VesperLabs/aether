import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;

const FRAME_SIZE = 4;
/** After a drop, the ghost strip waits this long and then drains to the new value, in ms. */
const GHOST_DELAY_MS = 250;
const GHOST_DRAIN_MS = 300;

export class Bar extends Phaser.GameObjects.Container {
  declare bar: Phaser.GameObjects.Sprite;
  /** A pale strip behind the bar that drains slowly, showing how much was just lost. */
  declare ghost: Phaser.GameObjects.Sprite;
  declare ghostTween?: Phaser.Tweens.Tween;
  declare percent: number;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    percent = 0,
    color = 0xff0000,
  ) {
    super(scene, x, y);
    this.width = width;
    this.height = height;

    // The corners
    const tl = new Sprite(scene, 0, 0, "misc-bars", 0).setFrame(0).setOrigin(0, 0);
    const tr = new Sprite(scene, width, 0, "misc-bars", 0).setFrame(2).setOrigin(1, 0);
    const bl = new Sprite(scene, 0, height, "misc-bars", 0).setFrame(6).setOrigin(0, 1);
    const br = new Sprite(scene, width, height, "misc-bars", 0).setFrame(8).setOrigin(1, 1);

    // The top and bottom slices
    const top = new Sprite(scene, FRAME_SIZE, 0, "misc-bars", 0)
      .setFrame(1)
      .setOrigin(0, 0)
      .setDisplaySize(width - FRAME_SIZE - FRAME_SIZE, FRAME_SIZE);
    const bot = new Sprite(scene, FRAME_SIZE, height, "misc-bars", 0)
      .setFrame(7)
      .setOrigin(0, 1)
      .setDisplaySize(width - FRAME_SIZE - FRAME_SIZE, FRAME_SIZE);
    // The left and right slices
    const left = new Sprite(scene, 0, FRAME_SIZE, "misc-bars", 0)
      .setFrame(3)
      .setOrigin(0, 0)
      .setDisplaySize(FRAME_SIZE, height - FRAME_SIZE - FRAME_SIZE);
    const right = new Sprite(scene, width, FRAME_SIZE, "misc-bars", 0)
      .setFrame(5)
      .setOrigin(1, 0)
      .setDisplaySize(FRAME_SIZE, height - FRAME_SIZE - FRAME_SIZE);
    const bg = new Sprite(scene, FRAME_SIZE, FRAME_SIZE, "misc-bars", 0)
      .setFrame(4)
      .setOrigin(0, 0)
      .setDisplaySize(width - FRAME_SIZE - FRAME_SIZE, FRAME_SIZE)
      .setTint(0x444444);

    this.ghost = new Sprite(scene, FRAME_SIZE, FRAME_SIZE, "misc-bars", 0)
      .setFrame(4)
      .setOrigin(0, 0)
      .setDisplaySize(width - FRAME_SIZE - FRAME_SIZE, FRAME_SIZE)
      .setTint(0xffeeaa);

    this.bar = scene.add.existing(
      new Sprite(scene, FRAME_SIZE, FRAME_SIZE, "misc-bars", 0)
        .setFrame(4)
        .setOrigin(0, 0)
        .setDisplaySize(width - FRAME_SIZE - FRAME_SIZE, FRAME_SIZE)
        .setTint(color),
    );

    // Add everything to the container
    this.add(tl);
    this.add(tr);
    this.add(bl);
    this.add(br);
    this.add(top);
    this.add(bot);
    this.add(left);
    this.add(right);
    this.add(bg);
    this.add(this.ghost);
    this.add(this.bar);
    this.setScale(0.5);
    this.center();
    this.setPercent(percent);
  }
  center() {
    this.x = -Math.floor(this.width / 4);
  }
  setPercent(percent: number) {
    if (percent === this.percent) return;
    const isDrop = this.percent !== undefined && percent < this.percent;
    const width = (this.width - FRAME_SIZE - FRAME_SIZE) * percent;
    this.percent = percent;
    this.bar.setDisplaySize(width, FRAME_SIZE);
    this.ghostTween?.stop();
    /* Healing (or the first fill) moves the ghost with the bar; a drop drains it after a beat */
    if (!isDrop) {
      this.ghost.setDisplaySize(width, FRAME_SIZE);
      return;
    }
    this.ghostTween = this.scene.tweens.add({
      targets: this.ghost,
      displayWidth: width,
      delay: GHOST_DELAY_MS,
      duration: GHOST_DRAIN_MS,
      ease: "Quad.easeIn",
    });
  }
}
