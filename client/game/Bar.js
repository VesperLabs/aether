import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;

const FRAME_SIZE = 4;

class Bar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, percent = 0, color = "0xFF0000") {
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
      .setTint("0x444444");

    this.bar = scene.add.existing(
      new Sprite(scene, FRAME_SIZE, FRAME_SIZE, "misc-bars", 0)
        .setFrame(4)
        .setOrigin(0, 0)
        .setDisplaySize(width - FRAME_SIZE - FRAME_SIZE, FRAME_SIZE)
        .setTint(color)
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
    this.add(this.bar);
    this.setScale(0.5);
    this.center();
    this.setPercent(percent);
  }
  center() {
    this.x = -Math.floor(this.width / 4);
  }
  setPercent(percent) {
    const newWidth = (this.width - FRAME_SIZE - FRAME_SIZE) * percent;
    this.bar.setDisplaySize(newWidth, this.bar.height);
  }
}

export default Bar;
