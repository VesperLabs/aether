import Character from "../src/Character";
class Player extends Character {
  /* Server level Player object */
  constructor(scene, { room, email, ...args }) {
    super(scene, args);
    this.scene = scene;
    this.room = room;
    this.email = email;
    scene.events.once("shutdown", this.destroy, this);
  }
}

module.exports = Player;
