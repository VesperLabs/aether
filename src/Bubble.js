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
    this.bWidth = 0;
    this.bHeight = 0;
    this.maxWidth = 128;

    this.bubbleText = new Phaser.GameObjects.BitmapText(this.scene, 8, 6, "nin-dark", this.message);
    this.wrapBitmapText(this.bubbleText, this.maxWidth);

    if (this.bubbleText.width > this.bWidth) {
      this.bWidth = this.bubbleText.width + 14;
    }
    if (this.bubbleText.height > this.bHeight) {
      this.bHeight = this.bubbleText.height + 10;
    }
    this.borders = [];
    this.d = [
      {
        x: 4,
        y: 4,
        width: this.bWidth - 4,
        height: this.bHeight - 4,
        texture: "misc-bubble",
        frame: 4,
      },
      { x: 0, y: 0, width: 4, height: 4, texture: "misc-bubble", frame: 0 },
      {
        x: 0 + this.bWidth,
        y: 0,
        width: 4,
        height: 4,
        texture: "misc-bubble",
        frame: 2,
      },
      {
        x: 0 + this.bWidth,
        y: 0 + this.bHeight,
        width: 4,
        height: 4,
        texture: "misc-bubble",
        frame: 8,
      },
      {
        x: 0,
        y: 0 + this.bHeight,
        width: 4,
        height: 4,
        texture: "misc-bubble",
        frame: 6,
      },
      {
        x: 4,
        y: 0,
        width: this.bWidth - 4,
        height: 4,
        texture: "misc-bubble",
        frame: 1,
      },
      {
        x: 4,
        y: 0 + this.bHeight,
        width: this.bWidth - 4,
        height: 4,
        texture: "misc-bubble",
        frame: 7,
      },
      {
        x: 0,
        y: 4,
        width: 4,
        height: this.bHeight - 4,
        texture: "misc-bubble",
        frame: 3,
      },
      {
        x: 0 + this.bWidth,
        y: 4,
        width: 4,
        height: this.bHeight - 4,
        texture: "misc-bubble",
        frame: 5,
      },
      {
        x: 0 + Math.floor(this.bWidth / 2) - 2,
        y: this.bHeight,
        width: 9,
        height: 6,
        texture: "misc-bubble-tail",
        frame: null,
      },
    ];
    // Create all of our corners and edges
    for (var i = 0; i < this.d.length; i++) {
      this.borders[i] = new Phaser.GameObjects.TileSprite(
        this.scene,
        this.d[i].x,
        this.d[i].y,
        this.d[i].width,
        this.d[i].height,
        this.d[i].texture,
        this.d[i].frame
      );
    }

    // Add all of the above to this sprite
    for (var i = 0; i < this.borders.length; i++) {
      this.borders[i].setOrigin(0, 0);
      this.add(this.borders[i]);
    }
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
    this.bWidth = 0;
    this.bHeight = 0;

    this.bubbleText.setText(this.message);
    this.wrapBitmapText(this.bubbleText, this.maxWidth);

    if (this.bubbleText.width > this.bWidth) {
      this.bWidth = this.bubbleText.width + 14;
    }
    if (this.bubbleText.height > this.bHeight) {
      this.bHeight = this.bubbleText.height + 10;
    }

    this.d = [
      {
        x: 4,
        y: 4,
        width: this.bWidth - 4,
        height: this.bHeight - 4,
        texture: "misc-bubble",
        frame: 4,
      },
      { x: 0, y: 0, width: 4, height: 4, texture: "misc-bubble", frame: 0 },
      {
        x: 0 + this.bWidth,
        y: 0,
        width: 4,
        height: 4,
        texture: "misc-bubble",
        frame: 2,
      },
      {
        x: 0 + this.bWidth,
        y: 0 + this.bHeight,
        width: 4,
        height: 4,
        texture: "misc-bubble",
        frame: 8,
      },
      {
        x: 0,
        y: 0 + this.bHeight,
        width: 4,
        height: 4,
        texture: "misc-bubble",
        frame: 6,
      },
      {
        x: 4,
        y: 0,
        width: this.bWidth - 4,
        height: 4,
        texture: "misc-bubble",
        frame: 1,
      },
      {
        x: 4,
        y: 0 + this.bHeight,
        width: this.bWidth - 4,
        height: 4,
        texture: "misc-bubble",
        frame: 7,
      },
      {
        x: 0,
        y: 4,
        width: 4,
        height: this.bHeight - 4,
        texture: "misc-bubble",
        frame: 3,
      },
      {
        x: 0 + this.bWidth,
        y: 4,
        width: 4,
        height: this.bHeight - 4,
        texture: "misc-bubble",
        frame: 5,
      },
      {
        x: 0 + Math.floor(this.bWidth / 2) - 2,
        y: this.bHeight,
        width: 9,
        height: 6,
        texture: "misc-bubble-tail",
        frame: null,
      },
    ];

    for (var i = 0; i < this.d.length; i++) {
      this.borders[i].x = this.d[i].x;
      this.borders[i].y = this.d[i].y;
      this.borders[i].width = this.d[i].width;
      this.borders[i].height = this.d[i].height;
    }

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
    this.x = -Math.floor(this.bWidth / 2) - 3;
    this.y = -this.bHeight + this.headY;
  }
  update() {}
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Bubble;
