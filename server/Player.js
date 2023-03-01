import Character from "../src/Character";
class Player extends Character {
  constructor(scene, args) {
    super(scene, args);

    //scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
}

module.exports = Player;
