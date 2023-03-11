import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;

const FRAME_SIZE = 4;

class Bar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height) {
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

    // Add everything to the container
    this.add(tl);
    this.add(tr);
    this.add(bl);
    this.add(br);
    this.add(top);
    this.add(bot);
    this.add(left);
    this.add(right);
    this.center();
  }
  center() {
    this.x = -Math.floor(this.width / 2);
  }
  setProgress(progress) {
    const width = (this.width - this.children[0].width - this.children[1].width) * progress;
    this.children[4].setDisplaySize(width, this.children[4].height);
  }
}

export default Bar;
