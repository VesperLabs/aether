import Character from "./Character";
class Player extends Character {
  /* Server level Player object */
  constructor(scene, { email, ...args }) {
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
  findInventoryItemById(id) {
    let returnItem = null;
    for (var i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i].id == id) {
        returnItem = this.inventory[i];
        break;
      }
    }
    return returnItem;
  }
  deleteInventoryItemAtId(id) {
    for (var i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i].id == id) {
        delete this.inventory.splice(i, 1);
        break;
      }
    }
  }
  update() {
    this.doRegen();
  }
  clearEquipmentSlot(slotName) {
    if (!this?.equipment?.[slotName]) return;
    this.equipment[slotName] = null;
  }
}

module.exports = Player;
