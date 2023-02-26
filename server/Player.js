const Phaser = require("phaser");
const Character = require("../client/src/Character");
class Player extends Character {
  constructor(scene, args) {
    super(scene, args);

    //scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
}

module.exports = Player;
