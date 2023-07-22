const WEAPON_COLOR_MAP = {
  fire: "0xff0000",
  light: "0xffff00",
  earth: "0x00ff00",
  water: "0x0000ff",
};

const ALPHA_STEP = 0.1;

class WeaponSprite extends Phaser.GameObjects.Container {
  constructor(scene, x, y, key, frame) {
    super(scene, x, y);

    this.borderSprites = [];
    this.colors = [];
    this.scene = scene;
    this.currentIndex = 0;
    this.alphaValue = 1;
    this.alphaDirection = -ALPHA_STEP;

    for (let i = 0; i < 4; i++) {
      const borderSprite = this.scene.add.sprite(0, 0, key, frame);
      borderSprite.setBlendMode(Phaser.BlendModes.SCREEN);
      this.borderSprites.push(borderSprite);
      this.add(borderSprite);
    }

    this.mainSprite = scene.add.sprite(0, 0, key, frame);
    this.add(this.mainSprite);
    this.updateBorderSpritePositions();
    this.updateBorderSpriteColors(this.colors[0]);
    scene.add.existing(this);

    this.updateEvent = scene.time.addEvent({
      delay: 60, // 1000 milliseconds (1 second)
      loop: true, // Set to `true` to repeat the event
      callback: this.update,
      callbackScope: this,
    });
    scene.events.once("shutdown", this.destroy, this);
  }
  setElements(elements = []) {
    this.colors = [];
    elements.forEach((element) => {
      this.colors.push(WEAPON_COLOR_MAP?.[element]);
    });
  }
  setTint(tint) {
    this.mainSprite.setTint(tint);
  }
  setFlipX(flip) {
    this.mainSprite.setFlipX(flip);
    this.borderSprites.forEach((borderSprite) => {
      borderSprite.setFlipX(flip);
    });
  }
  setTexture(texture) {
    this.mainSprite.setTexture(texture);
    this.borderSprites.forEach((borderSprite) => {
      borderSprite.setTexture(texture);
    });
  }
  setFlipY(flip) {
    this.mainSprite.setFlipY(flip);
    this.borderSprites.forEach((borderSprite) => {
      borderSprite.setFlipY(flip);
    });
  }
  updateBorderSpritePositions() {
    const borderOffset = 1;
    this.borderSprites[0].setPosition(0, -borderOffset);
    this.borderSprites[1].setPosition(0, borderOffset);
    this.borderSprites[2].setPosition(-borderOffset, 0);
    this.borderSprites[3].setPosition(borderOffset, 0);
  }
  updateBorderSpriteColors(color) {
    if (!color) return;
    this.borderSprites.forEach((borderSprite) => {
      borderSprite.setTintFill(color);
    });
  }
  updateBorderSpriteAlpha(alpha) {
    this.borderSprites.forEach((borderSprite) => {
      borderSprite.setAlpha(alpha);
    });
  }
  update() {
    if (this.colors.length === 0) {
      return this.updateBorderSpriteAlpha(0);
    }
    const nextIndex = (this.currentIndex + 1) % this.colors.length;
    const nextColor = this.colors[nextIndex];

    // Update the alpha value based on the alpha direction
    this.alphaValue += this.alphaDirection;

    // If the alpha value is less than 0, set it to 0 and update the current index
    if (this.alphaValue < 0) {
      this.alphaValue = 0;
      this.currentIndex = nextIndex;
      this.alphaDirection = ALPHA_STEP;
    }

    // If the alpha value is greater than 1, set it to 1 and update the current index
    if (this.alphaValue > 1) {
      this.alphaValue = 1;
      this.alphaDirection = -ALPHA_STEP;
    }

    this.updateBorderSpriteAlpha(this.alphaValue);
    this.updateBorderSpriteColors(nextColor);
  }
  numberToHexColor(color) {
    return color.toString(16).padStart(6, "0");
  }
  destroy() {
    if (this.scene) {
      this.scene.events.off("update", this.update, this);
      this.updateEvent.remove();
    }
    super.destroy();
  }
}

export default WeaponSprite;
