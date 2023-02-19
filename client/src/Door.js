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
  }
}

module.exports = Door;
