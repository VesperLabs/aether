import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;

const FRAME_SIZE = 4;

class Bubble extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} headY negative number of the position from center a sprites head is
   * @param {object} text
   * @memberof Bubble
   */
  constructor(scene, headY, message) {
    super(scene, 0, 0);

    this.headY = headY;
    this.message = message;
    this.maxWidth = 256;
    this.width = 30;
    this.height = 30;

    this.bubbleText = new Phaser.GameObjects.BitmapText(this.scene, 8, 6, "nin-dark", this.message);

    // The corners
    this.tl = scene.add.existing(
      new Sprite(scene, 0, 0, "misc-bubble", 0).setFrame(0).setOrigin(0, 0)
    );
    this.bl = scene.add.existing(
      new Sprite(scene, 0, this.height, "misc-bubble", 0).setFrame(6).setOrigin(0, 1)
    );
    this.tr = scene.add.existing(
      new Sprite(scene, this.width, 0, "misc-bubble", 0).setFrame(2).setOrigin(1, 0)
    );
    this.br = scene.add.existing(
      new Sprite(scene, this.width, this.height, "misc-bubble", 0).setFrame(8).setOrigin(1, 1)
    );

    // The top and bottom slices
    this.top = scene.add.existing(
      new Sprite(scene, FRAME_SIZE, 0, "misc-bubble", 0).setFrame(1).setOrigin(0, 0)
    );
    this.bot = scene.add.existing(
      new Sprite(scene, FRAME_SIZE, this.height, "misc-bubble", 0).setFrame(7).setOrigin(0, 1)
    );
    // The left and right slices
    this.left = scene.add.existing(
      new Sprite(scene, 0, FRAME_SIZE, "misc-bubble", 0).setFrame(3).setOrigin(0, 0)
    );
    this.right = scene.add.existing(
      new Sprite(scene, this.width, FRAME_SIZE, "misc-bubble", 0).setFrame(5).setOrigin(1, 0)
    );
    this.bg = scene.add.existing(
      new Sprite(scene, FRAME_SIZE, FRAME_SIZE, "misc-bubble", 0).setFrame(4).setOrigin(0, 0)
    );
    this.tail = scene.add.existing(
      new Sprite(scene, FRAME_SIZE, this.height, "misc-bubble-tail", 0).setOrigin(0, 1)
    );

    // Add everything to the container
    this.add(this.tl);
    this.add(this.bl);
    this.add(this.tr);
    this.add(this.br);
    this.add(this.top);
    this.add(this.bot);
    this.add(this.left);
    this.add(this.right);
    this.add(this.bg);
    this.add(this.tail);
    this.wrapBitmapText(this.bubbleText, this.maxWidth);
    this.add(this.bubbleText);
    this.setMessage(this.message);
  }
  setMessage(message) {
    if (!message) {
      return this.setVisible(false);
    }
    this.setVisible(true);
    this.message = message;
    this.bubbleText.setText(this.message);
    this.wrapBitmapText(this.bubbleText, this.maxWidth);
    this.width = this.bubbleText.width + 10;
    this.height = this.bubbleText.height + 5;
    this.bg.setDisplaySize(this.width, this.height);
    this.top.setDisplaySize(this.width, FRAME_SIZE);
    this.bot.setDisplaySize(this.width, FRAME_SIZE);
    this.bot.y = this.height + FRAME_SIZE * 2;
    this.br.y = this.height + FRAME_SIZE * 2;
    this.br.x = this.width + FRAME_SIZE * 2;
    this.bl.y = this.height + FRAME_SIZE * 2;
    this.left.setDisplaySize(FRAME_SIZE, this.height);
    this.right.setDisplaySize(FRAME_SIZE, this.height);
    this.right.x = this.width + FRAME_SIZE * 2;
    this.tr.x = this.width + FRAME_SIZE * 2;
    this.tail.y = this.height + FRAME_SIZE * 2 + 3;
    this.tail.x = (this.width + FRAME_SIZE * 2) / 2 - 4;
    this.setScale(0.5);
    this.center();
  }
  wrapBitmapText = function (bitmapText, maxWidth) {
    var words = bitmapText.text.split(" ");
    let output = "";
    3;
    let test = "";

    for (var w = 0, len = words.length; w < len; w++) {
      test += words[w] + " ";
      bitmapText.setText(test);
      bitmapText.update();
      if (bitmapText.width > maxWidth) {
        output += "\n" + words[w] + " ";
      } else {
        output += words[w] + " ";
      }
      test = output;
    }

    output = output.replace(/(\s)$/gm, ""); // remove trailing spaces
    output = output.replace(/^\s+|\s+$/g, ""); // remove beginning/trailing returns
    output = this.wbr(output, 20);
    bitmapText.setText(output);
    bitmapText.update();
  };
  wbr(str, num) {
    return str.replace(RegExp("(\\w{" + num + "})(\\w)", "g"), function (all, text, char) {
      return text + "\n" + char;
    });
  }
  center() {
    this.x = -Math.floor((this.width + FRAME_SIZE * 2) / 4);
    this.y = -Math.floor(this.height / 2 + (FRAME_SIZE * 2) / 2) + this.headY - 2;
  }
  update() {}
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Bubble;
