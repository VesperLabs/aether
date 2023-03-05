import Character from "../src/Character";
class Player extends Character {
  constructor(scene, { room, ...args }) {
    super(scene, args);
    this.scene = scene;
    this.room = room;
    //scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
}

module.exports = Player;
