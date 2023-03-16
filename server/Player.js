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
  findEquipmentById(id) {
    const [slotName, foundItem] = Object.entries(this?.equipment).find(
      ([slotName, slotItem]) => slotItem?.id === id
    ) || [null, null];
    return { item: foundItem, slotName };
  }
  clearEquipmentSlot(slotName) {
    if (!this?.equipment?.[slotName]) return;
    this.equipment[slotName] = null;
  }
}

module.exports = Player;
