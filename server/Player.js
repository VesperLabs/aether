import Character from "./Character";
class Player extends Character {
  /* Server level Player object */
  constructor(scene, { room, email, ...args }) {
    super(scene, args);
    this.email = email;
  }
  setDead() {
    this.state.isDead = true;
  }
}

module.exports = Player;
