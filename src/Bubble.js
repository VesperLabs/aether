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
    this.maxWidth = 128;

    this.bubbleText = new Phaser.GameObjects.BitmapText(this.scene, 8, 6, "nin-dark", this.message);
    this.wrapBitmapText(this.bubbleText, this.maxWidth);

    this.add(this.bubbleText);
    this.setMessage(this.message);
  }
  setMessage(message) {
    if (!message) {
      this.setVisible(false);
      return;
    } else {
      this.setVisible(true);
    }
    this.message = message;
    this.bubbleText.setText(this.message);
    this.wrapBitmapText(this.bubbleText, this.maxWidth);

    this.center();
  }
  setHeadY(headY) {
    this.headY = headY;
    this.center();
  }
  wrapBitmapText = function (bitmapText, maxWidth) {
    var words = bitmapText.text.split(" ");
    let output = "";
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
    this.x = -Math.floor(this.bubbleText.width / 2) - 5;
    this.y = -this.bubbleText.height + this.headY;
  }
  update() {}
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Bubble;
