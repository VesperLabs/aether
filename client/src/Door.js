const Phaser = require("phaser");

class Door extends Phaser.GameObjects.Sprite {
  constructor(scene, { x, y, width, height, name, properties }) {
    super(scene, x, y, "icons");
    this.setOrigin(0, 0);
    this.name = name;
    this.destDoor = properties?.find((p) => p.name === "destDoor")?.value;
    this.destMap = properties?.find((p) => p.name === "destMap")?.value;
    this.displayWidth = width;
    this.displayHeight = height;
    this.centerPos = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }
  getProps() {
    return {
      name: this.name,
      destMap: this.destMap,
      destDoor: this.destDoor,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      centerPos: this.centerPos,
    };
  }
}

module.exports = Door;
